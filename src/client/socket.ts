import debugFactory, { IDebugger } from "debug"

import { OutboundMessage } from "../message/outbound"
import { InboundMessage, InboundMessageType } from "../message/inbound"
import { DfuseClientError, DfuseSocketError } from "../types/error"
import { WebSocket, Socket, SocketMessageListener, WebSocketFactory } from "../types/socket"

export type SocketOptions = {
  id?: string
  autoReconnect?: boolean
  reconnectDelayInMs?: number
  keepAlive?: boolean
  keepAliveIntervalInMs?: number
  webSocketFactory?: WebSocketFactory

  onInvalidMessage?: (message: object) => void
  onReconnect?: () => void
  onError?: (message: object) => void
  onClose?: (message: object) => void
}

export function createSocket(url: string, options: SocketOptions = {}): Socket {
  return new DefaultSocket(url, {
    id: "",
    autoReconnect: true,
    reconnectDelayInMs: DEFAULT_RECONNECT_DELAY_IN_MS,
    keepAlive: true,
    keepAliveIntervalInMs: DEFAULT_KEEP_ALIVE_INTERVAL_IN_MS,
    webSocketFactory: inferWebSocketFactory(options.webSocketFactory),
    ...options
  })
}

function inferWebSocketFactory(webSocketFactory?: WebSocketFactory): WebSocketFactory {
  const debug = debugFactory("dfuse:socket")

  if (webSocketFactory !== undefined) {
    debug("Using user provided `webSocketFactory` option.")
    return webSocketFactory
  }

  // If we are in a Browser environment and `WebSocket` is available, use it
  if (typeof window !== "undefined" && (window as any).WebSocket != null) {
    debug("Using `WebSocket` global value found on 'window' variable (Browser environment).")
    return (url: string) => Promise.resolve(new (window as any).WebSocket(url))
  }

  // If we are in a Node.js like environment and `WebSocket` is available, use it
  if (typeof global !== "undefined" && (global as any).WebSocket != null) {
    debug("Using `WebSocket` global value found on 'global' variable (Node.js environment).")
    return (url: string) => Promise.resolve(new (global as any).WebSocket(url))
  }

  // Otherwise, throw an exception
  const messages = [
    "You did not provide a `webSocket` option and we were not able find a `WebSocket` object in",
    "the global scope to create use.",
    "",
    "You are most likely in a Node.js environment where a global `WebSocket` is not available by default.",
    "To resolve the issue, either pass a compatible `webSocket` option or globally defined a `global.WebSocket`",
    "variable pointing to a compatible `WebSocket` client.",
    "",
    "We invite you to read our documentation to learn more about this problem.",
    "",
    "See https://github.com/dfuse-io/client-js#nodejs"
  ]

  throw new DfuseClientError(messages.join("\n"))
}

const noop = () => {
  return
}

type Resolver<T> = (value?: T | PromiseLike<T>) => void
type Rejecter = (reason?: any) => void

const DEFAULT_KEEP_ALIVE_INTERVAL_IN_MS = 30000 // 30s
const DEFAULT_RECONNECT_DELAY_IN_MS = 5000 // 5s

class DefaultSocket implements Socket {
  private url: string
  private apiToken?: string
  private options: SocketOptions

  public isConnected: boolean = false
  public socket?: WebSocket

  private debug: IDebugger
  private listener?: SocketMessageListener
  private onReconnectListener?: () => void
  private intervalHandler?: any

  private connectionPromise?: Promise<void>
  private closePromise?: Promise<void>
  private closeResolver?: Resolver<void>

  public constructor(url: string, options: SocketOptions) {
    this.url = url
    this.options = options

    this.debug = debugFactory("dfuse:socket" + (options.id !== "" ? `:${options.id}` : ""))
  }

  public setApiToken(apiToken: string): void {
    this.debug("Socket API token updated to %s.", apiToken)
    this.apiToken = apiToken
  }

  public async connect(
    listener: SocketMessageListener,
    options: { onReconnect?: () => void } = {}
  ): Promise<void> {
    this.debug("About to connect to remote endpoint.")
    if (this.connectionPromise !== undefined) {
      return this.connectionPromise
    }

    this.listener = listener
    this.onReconnectListener = options.onReconnect

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.debug("Connection promise started, creating and opening socket.")
      if (this.isConnected) {
        return
      }

      this.createAnOpenSocket(
        this.onSocketConnectOpenFactory(resolve),
        this.onSocketErrorFactory(reject),
        reject
      )
    })

    this.debug("Connection to remote endpoint in-progress, returning promise to caller.")
    return this.connectionPromise
  }

  public async disconnect(): Promise<void> {
    this.debug("About to disconnect from remote endpoint.")
    if (this.closePromise) {
      this.debug("A disconnect is already in progress, joining it for termination.")
      return this.closePromise
    }

    if (this.socket === undefined) {
      return
    }

    this.onReconnectListener = undefined
    this.listener = undefined

    this.debug("Closing socket.")
    this.socket.close()

    // We must not clean up the socket at this point yet. Cleaning up the socket means
    // removing the actual event listeners. If you clean up just yet, the `onclose` event
    // will not be handled and the consumer of the library does not receive its own
    // `onClose` event. Instead, let's do the clean up once we receive the socket
    // `onclose` event.

    this.debug(
      "Lazily disconnected, remaining clean up shall be performed when receiving `onclose` event."
    )
    this.isConnected = false

    this.closePromise = new Promise((resolve) => {
      // Shall be resolved by the `onClose` event handler on this class
      this.closeResolver = resolve
    })

    return this.closePromise
  }

  public async send<T>(message: OutboundMessage<T>): Promise<void> {
    if (!this.isConnected) {
      this.debug("Not connected, re-connecting prior sending message.")
      await this.reconnect()
    }

    if (!this.isConnected) {
      this.debug("Socket not connected, unable to send message correctly.")
      throw new DfuseSocketError("Socket not connected, unable to send message correctly.")
    }

    this.debug("Sending message %O through socket.", message)
    this.socket!.send(JSON.stringify(message))
  }

  private async createAnOpenSocket(
    onSocketOpen: () => void,
    onSocketError: (event: Event) => void,
    onSocketFactoryError: (error: any) => void
  ): Promise<void> {
    const url = this.buildUrl()

    this.debug("Starting connection handshake with remote url %s.", url)
    try {
      const socket: WebSocket = await this.options.webSocketFactory!(url)

      socket.onopen = onSocketOpen
      socket.onerror = onSocketError
      socket.onclose = this.onSocketClose
      socket.onmessage = this.onSocketMessage

      this.socket = socket
    } catch (error) {
      onSocketFactoryError(error)
    }
  }

  private buildUrl(): string {
    if (this.apiToken === undefined) {
      // FIXME: Shall we throw an exception instead?
      return this.url
    }

    // FIXME: Decompose url, add query param api token if available, then re-compose url!
    if (this.url.includes("?")) {
      return `${this.url}&token=${this.apiToken}`
    }

    return `${this.url}?token=${this.apiToken}`
  }

  private onSocketConnectOpenFactory = (resolve: Resolver<void>) => () => {
    this.debug("Received `onopen` (via connect) notification from socket.")
    this.isConnected = true
    this.connectionPromise = undefined

    if (this.keepAliveOption() === true) {
      this.registerKeepAliveHandler()
    }

    this.debug("Signaling completion of `connect` method in the outer scope.")
    resolve()
  }

  private onSocketReconnectOpenFactory = (resolve: Resolver<boolean>) => () => {
    this.debug("Received `onopen` (via reconnect) notification from socket.")
    this.isConnected = true
    this.connectionPromise = undefined

    if (this.keepAliveOption() === true) {
      this.registerKeepAliveHandler()
    }

    this.debug("Signaling completion of `reconnect` method in the outer scope.")
    resolve(true)

    this.debug("Sending a `onReconnect` notification to client consumer.")
    this.onReconnect()
  }

  private onSocketErrorFactory = (reject: Rejecter) => (event: Event) => {
    this.debug("Received `onerror` notification from socket.")

    // The official WebSocket flow is to always send an `onclose` event after an `onerror`
    // ones, as such, we must not clean the socket at this point. We must always
    // wait and ensures the `onclose` event will be called and that clean up will
    // happen in the `onclose` handler.

    this.debug("Signaling rejection of connection in the outer scope.")
    reject(event)

    this.debug("Sending an `onError` notification to client consumer.")
    this.onError(event)
  }

  private onSocketClose = (event: CloseEvent) => {
    this.debug("Received `onclose` notification from socket.")
    this.isConnected = false
    this.connectionPromise = undefined

    if (this.closeResolver) {
      this.debug("Resolving disconnect close promise.")
      this.closeResolver()
      this.closeResolver = undefined
      this.closePromise = undefined
    }

    this.cleanSocket()

    this.debug("Sending a `onClose` notification to client consumer.")
    this.onClose(event)

    if (event.code !== 1000 && event.code !== 1005) {
      this.debug("Socket has close abnormally, trying to re-connect to socket.")
      this.reconnect()
    }
  }

  private onSocketMessage = (event: MessageEvent) => {
    let payload: any
    try {
      payload = JSON.parse(event.data) as { [key: string]: any }
    } catch (error) {
      this.debug("Received a non JSON message, are you sure you are talking to dfuse API?")
      return
    }

    const type = payload.type
    if (!this.canHandleType(type)) {
      this.debug(
        "Sending an `onInvalidMessage` notification to client consumer for type [%s].",
        type
      )
      this.onInvalidMessage(payload)
      return
    }

    if (type === "ping") {
      this.debug("Discarding 'ping' message from reaching the underlying message listener.")
      return
    }

    if (this.listener) {
      this.listener(payload as InboundMessage)
    }
  }

  private canHandleType(type: string) {
    const actualType = (type || "").toLowerCase()
    const validTypes = Object.keys(InboundMessageType).map((value) => value.toLowerCase())

    // We know that in the Enum, keys are the same as the type values, so this works
    return validTypes.indexOf(actualType) > -1
  }

  private registerKeepAliveHandler() {
    const keepAliveInterval =
      this.options.keepAliveIntervalInMs || DEFAULT_KEEP_ALIVE_INTERVAL_IN_MS

    this.debug("Unregistering keep alive interval")
    this.intervalHandler = setInterval(() => {
      if (!this.isConnected || this.socket === undefined) {
        return
      }

      this.debug("Sending keep alive pong through socket.")
      this.socket.send(JSON.stringify({ type: "pong" }))
    }, keepAliveInterval)
  }

  private unregisterKeepAliveHandler() {
    if (this.intervalHandler === undefined) {
      return
    }

    this.debug("Unregistering keep alive interval")
    clearInterval(this.intervalHandler)
    this.intervalHandler = undefined
  }

  private async reconnect(): Promise<boolean> {
    if (this.connectionPromise) {
      try {
        this.debug("Awaiting actual connection to complete.")
        await this.connectionPromise
        return true
      } catch (error) {
        this.debug("Original connection did not succeed, continuing re-connection process.")
      }
    }

    if (!this.options.autoReconnect) {
      this.debug("Not re-connecting because client consumer auto reconnect option is falsy.")
      return false
    }

    let reconnectDelay = this.options.reconnectDelayInMs
    if (reconnectDelay === undefined) {
      reconnectDelay = DEFAULT_RECONNECT_DELAY_IN_MS
    }

    return new Promise<boolean>((resolve, reject) => {
      setTimeout(() => {
        this.createAnOpenSocket(
          this.onSocketReconnectOpenFactory(resolve),
          this.onSocketErrorFactory(reject),
          reject
        )
      }, reconnectDelay)
    })
  }

  private cleanSocket() {
    if (this.intervalHandler !== undefined) {
      this.unregisterKeepAliveHandler()
    }

    if (this.socket === undefined) {
      return
    }

    this.socket.onopen = noop
    this.socket.onclose = noop
    this.socket.onerror = noop
    this.socket.onmessage = noop

    this.socket = undefined
  }

  private onInvalidMessage(message: object) {
    ;(this.options.onInvalidMessage || noop)(message)
  }

  /**
   * We notify both the `onReconnect` option passed when constructing
   * the socket and the one (if present) that was passed when connecting
   * the socket.
   *
   * Those are two different listeners and must be both sent when possible.
   */
  private onReconnect() {
    // Let's call the `connect` `onReconnectListener` first.
    ;(this.onReconnectListener || noop)()
    ;(this.options.onReconnect || noop)()
  }

  private onClose(message: any) {
    ;(this.options.onClose || noop)(message)
  }

  private onError(message: any) {
    ;(this.options.onError || noop)(message)
  }

  private keepAliveOption(): boolean {
    return this.options.keepAlive === undefined ? true : this.options.keepAlive
  }
}
