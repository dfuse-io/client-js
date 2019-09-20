import debugFactory, { IDebugger } from "debug"
import { DfuseClientError, DfuseSocketError } from "../types/error"
import {
  WebSocket,
  Socket,
  SocketMessageListener,
  WebSocketFactory,
  SocketConnectOptions
} from "../types/socket"

export interface SocketOptions {
  /**
   * An id to assign to this socket instance. This is used through the `debug`
   * package to display a different `debug` tag when provided (i.e. `dfuse:socket:<id>`).
   *
   * @default `undefined`
   */
  id?: string

  /**
   * Determines if the socket should automatically re-connect with the upstream
   * service upon an abnormal disconnection.
   *
   * The re-connection happens after the given [[SocketOptions.reconnectDelayInMs]]
   * has elapsed.
   *
   * @default `true`
   */
  autoReconnect?: boolean

  /**
   * The delay after the abnormal closure of the connection before trying a
   * re-connection. As no effect if [[SocketOptions.autoReconnect]] is sets
   * to `false`.
   *
   * @default `2.5s` (See [[DEFAULT_RECONNECT_DELAY_IN_MS]])
   */
  reconnectDelayInMs?: number

  /**
   * Whether `ping` messages should be send automatically at regular interval
   * by the [[Socket]] instance. The actual interval used can be defined by
   * providing the [[SocketOptions.keepAliveIntervalInMs]] option.
   *
   * @default `true`
   */
  keepAlive?: boolean

  /**
   * The interval of time at which `ping` messages are automatically sent to
   * the remote endpoint. This is time that elapsed between two consecutives
   * `ping` messages.
   *
   * As no effect if [[SocketOptions.keepAlive]] is sets to `false`.
   *
   * @default `30s` (See [[DEFAULT_KEEP_ALIVE_INTERVAL_IN_MS]])
   */
  keepAliveIntervalInMs?: number

  /**
   * The set of webSocket protocols we want to send when performing the
   * connection handshake. For example, GraphQL subscription over WebSocket
   * uses "graphql-ws" protocol while standard WebSocket connection can
   * pass `undefined` as the value.
   *
   * @default `undefined`
   */
  webSocketProtocols?: string | string[]

  /**
   * A factory method used to create the `WebSocket` instance that should be
   * used by the [[Socket]] instance.
   *
   * **Inferrence**<br><br>
   * When not provided (default), the factory to use is actually inferred
   * based on the runtime environment.
   *
   * If a `window.WebSocket` variable exists, which should be the case on a Browser
   * environment, the factory used will call `new window.WebSocket(...)` to instantiate
   * the `WebSocket` instance.
   *
   * If a `global.WebSocket` variable exists, which can be the case upon a
   * `global.WebSocket = ...` call at the bootstrap phase in a Node.js environment,
   * the factory used will call `new global.WebSocket(...)` to instantiate
   * the `WebSocket` instance.
   *
   * Finally, if no `WebSocket` instance could be determined, a [[DfuseError]] is
   * thrown with a message explaining the situtation and a link to the documentation
   * on how to solve the problem.
   *
   * @default `undefined` (Inferred based on environment, see `Inferrence` note above)
   */
  webSocketFactory?: WebSocketFactory

  /**
   * A callback that can be provided to be notified when the [[Socket]] just performed
   * a re-connection. This will be called after a successful re-connection. When the callback
   * is invoked, the connection with the server has actually resumed and stream can be
   * restarted or other actions can be taken.
   *
   * This is a post re-connection callback.
   *
   * @default `() => {}` (noop)
   */
  onReconnect?: () => void

  /**
   * A callback that can be provided to be notified when the [[Socket]] receives an
   * error event. The error event is always emitted only where an error occurred with
   * the connection. It is not emitted on a normal and expected disconnection with
   * the server (when closing the underlying socket for example).
   *
   * The callback will be invoked with the actual event as defined by the `WebSocket`
   * instance used.
   *
   * **Important Note**<br><br>
   * The actual `event` object you will receive is different wheter you use
   * the Browser `WebSocket` instance ([ErrorEvent](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/error_event))
   * or depending on the Node.js library you use (If you use [ws](https://www.npmjs.com/package/ws) package, then it's
   * [ErrorEvent](https://github.com/websockets/ws/blob/master/lib/event-target.js#L87))
   *
   * @default `() => {}` (noop)
   */
  onError?: (event: object) => void

  /**
   * A callback that can be provided to be notified when the [[Socket]] receives a
   * close event. The close event is always emitted even when an error has occurred, it
   * will however always come **after** the error event.
   *
   * The callback will be invoked with the actual event as defined by the `WebSocket`
   * instance used.
   *
   * **Important Note**<br><br>
   * The actual `event` object you will receive is different wheter you use
   * the Browser `WebSocket` instance ([CloseEvent](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close_event))
   * or depending on the Node.js library you use (If you use [ws](https://www.npmjs.com/package/ws) package, then it's
   * [CloseEvent](https://github.com/websockets/ws/blob/master/lib/event-target.js#L47))
   *
   * @default `() => {}` (noop)
   */
  onClose?: (event: object) => void
}

// @deprecated Please use SocketConnectOptions instead, will be removed eventually
export type ConnectOptions = SocketConnectOptions

/**
 * Create an actual [[Socket]] instance that will be used as the interface to wrap all
 * communicaton of the WebSocket protocol.
 *
 * @param url The url used to reach the dfuse Stream API, should **not** contain the `token` query parameter.
 * @param options The options used to configure the [[Socket]] instance, see [[SocketOptions]] for default options.
 */
export function createSocket(url: string, options: SocketOptions = {}): Socket {
  return new DefaultSocket(url, {
    id: "",
    autoReconnect: true,
    reconnectDelayInMs: DEFAULT_RECONNECT_DELAY_IN_MS,
    keepAlive: true,
    keepAliveIntervalInMs: DEFAULT_KEEP_ALIVE_INTERVAL_IN_MS,
    webSocketFactory: inferWebSocketFactory(
      options.id,
      options.webSocketProtocols,
      options.webSocketFactory
    ),
    ...options
  })
}

function inferWebSocketFactory(
  id: string | undefined,
  webSocketProtocols?: string | string[],
  webSocketFactory?: WebSocketFactory
): WebSocketFactory {
  const debug = debugFactory("dfuse:socket" + (id ? `:${id}` : ""))

  if (webSocketFactory !== undefined) {
    debug("Using user provided `webSocketFactory` option.")
    return webSocketFactory
  }

  // If we are in a Browser environment and `WebSocket` is available, use it
  if (typeof window !== "undefined" && (window as any).WebSocket != null) {
    debug("Using `WebSocket` global value found on 'window' variable (Browser environment).")
    return async (url: string) => new (window as any).WebSocket(url, webSocketProtocols)
  }

  // If we are in a Node.js like environment and `WebSocket` is available, use it
  if (typeof global !== "undefined" && (global as any).WebSocket != null) {
    debug("Using `WebSocket` global value found on 'global' variable (Node.js environment).")
    return async (url: string) => new (global as any).WebSocket(url, webSocketProtocols, {})
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

export const DEFAULT_KEEP_ALIVE_INTERVAL_IN_MS = 30000 // 30s
export const DEFAULT_RECONNECT_DELAY_IN_MS = 2500 // 2.5s

class DefaultSocket implements Socket {
  private url: string
  private apiToken?: string
  private options: SocketOptions

  public isConnected: boolean = false
  public socket?: WebSocket

  private debug: IDebugger
  private listener?: SocketMessageListener
  private onReconnectListener?: () => void
  private onTerminationListener?: () => void
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
    options: SocketConnectOptions = {}
  ): Promise<void> {
    this.debug("About to connect to remote endpoint.")
    if (this.connectionPromise !== undefined) {
      return this.connectionPromise
    }

    if (this.isConnected) {
      return
    }

    this.listener = listener
    this.onReconnectListener = options.onReconnect
    this.onTerminationListener = options.onTermination

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.debug("Connection promise started, creating and opening socket.")
      this.createAnOpenSocket(
        this.onSocketConnectOpenFactory(resolve),
        this.onSocketErrorFactory(reject),
        this.onSocketCloseFactory(),
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

  public async send<T = unknown>(message: T): Promise<void> {
    if (!this.isConnected) {
      this.debug("Not connected, re-connecting prior sending message.")
      await this.reconnect()
    }

    if (!this.isConnected) {
      this.debug("Socket not connected, unable to send message correctly.")
      throw new DfuseSocketError("Socket not connected, unable to send message correctly.")
    }

    this.debug("Sending message %o through socket.", message)
    this.socket!.send(JSON.stringify(message))
  }

  private async createAnOpenSocket(
    onSocketOpen: () => void,
    onSocketError: (event: Event) => void,
    onSocketClose: (event: CloseEvent) => void,
    onSocketFactoryError: (error: any) => void
  ): Promise<void> {
    const url = this.buildUrl()

    this.debug("Starting connection handshake with remote url %s.", url)
    try {
      const socket: WebSocket = await this.options.webSocketFactory!(url)

      socket.onopen = onSocketOpen
      socket.onerror = onSocketError
      socket.onclose = onSocketClose
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

  private onSocketReconnectErrorFactory = () => (event: Event) => {
    this.debug("Received `onerror` (via reconnect) notification from socket.")

    this.debug("Sending an `onError` notification to client consumer.")
    this.onError(event)
  }

  private onSocketCloseFactory = () => {
    return this.commonOnSocketCloseFactory("connect", () => {
      this.reconnect().catch((error) => {
        this.debug("The re-connection never succeed, will not retry anymore.", error)
      })
    })
  }

  private onSocketReconnectCloseFactory = (resolve: Resolver<void>, reject: Rejecter) => {
    return this.commonOnSocketCloseFactory("reconnect", () => {
      this.tryReconnect(resolve, reject)
    })
  }

  private commonOnSocketCloseFactory = (
    tag: "connect" | "reconnect",
    reconnectWorker: () => void
  ) => (event: CloseEvent) => {
    this.debug("Received `onclose` (via %s) notification from socket.", tag)
    this.isConnected = false
    this.connectionPromise = undefined

    if (this.closeResolver) {
      this.debug("Resolving disconnect close promise (via %s).", tag)
      this.closeResolver()
      this.closeResolver = undefined
      this.closePromise = undefined
    }

    this.cleanSocket()

    this.debug(
      "Sending a `onClose` (%d) notification to client consumer (via %s).",
      event.code,
      tag
    )
    this.onClose(event)

    if (event.code !== 1000 && this.options.autoReconnect) {
      this.debug(
        "Socket has close abnormally (via %s), trying to re-connect to socket (infinite retry).",
        tag
      )

      reconnectWorker()
    } else {
      // It's really the end, notify `onTermination` handler if set
      if (this.onTerminationListener) {
        this.onTerminationListener()
      }
    }
  }

  private onSocketMessage = (event: MessageEvent) => {
    let message: any
    try {
      message = JSON.parse(event.data) as { [key: string]: any }
    } catch (error) {
      this.debug("Received a non-JSON message, are you sure you are talking to dfuse API?")
      return
    }

    if (this.listener) {
      this.listener(message)
    }
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
    this.debug("Reconnect has been invoked, perfoming initial re-connection logic.")
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

    return new Promise<boolean>(this.tryReconnect)
  }

  private tryReconnect = (resolve: any, reject: any) => {
    let reconnectDelay = this.options.reconnectDelayInMs
    if (reconnectDelay === undefined) {
      reconnectDelay = DEFAULT_RECONNECT_DELAY_IN_MS
    }

    this.debug(`Waiting ${reconnectDelay}ms before trying to perform the re-connection.`)
    setTimeout(() => {
      this.createAnOpenSocket(
        this.onSocketReconnectOpenFactory(resolve),
        this.onSocketReconnectErrorFactory(),
        this.onSocketReconnectCloseFactory(resolve, reject),
        reject
      )
    }, reconnectDelay)
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

  /**
   * We notify both the `onReconnect` option passed when constructing
   * the socket and the one (if present) that was passed when connecting
   * the socket.
   *
   * Those are two different listeners and must be both sent when possible.
   */
  private onReconnect() {
    // Let's call the `connect` `onReconnectListener` first then followed
    // by the one the consumer of the socket passed
    if (this.onReconnectListener) this.onReconnectListener()
    if (this.options.onReconnect) this.options.onReconnect()
  }

  private onClose(message: any) {
    if (this.options.onClose) this.options.onClose(message)
  }

  private onError(message: any) {
    if (this.options.onError) this.options.onError(message)
  }

  private keepAliveOption(): boolean {
    return this.options.keepAlive === undefined ? true : this.options.keepAlive
  }
}
