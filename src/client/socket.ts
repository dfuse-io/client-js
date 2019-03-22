import debugFactory, { IDebugger } from "debug"

import { OutboundMessage } from "../message/outbound"
import { InboundMessage, InboundMessageType } from "../message/inbound"

// FIXME: Using the `WebSocket` type resolves to DOM `WebSocket` object.
//        If consumer of library is not DOM aware via TypeScript, the actual
//        `WebSocket` type in the consuming library will not be resolved
//        and the library compilation will fail even if the type def is in
//        our own library. Not sure what is the best course of action to
//        fix this!
export type WebSocketFactory = () => any

export function createEoswsSocket(webSocketFactory: WebSocketFactory, options: SocketOptions = {}) {
  return new DefaultEoswsSocket(
    webSocketFactory,
    Object.assign({}, { autoReconnect: true }, options)
  )
}

export interface EoswsSocket {
  isConnected: boolean

  connect(listener: SocketMessageListener): Promise<void>
  disconnect(): Promise<void>

  send<T>(message: OutboundMessage<T>): Promise<boolean>
}

export type SocketMessageListener = (message: InboundMessage<any>) => void

export interface SocketOptions {
  id?: string
  autoReconnect?: boolean
  reconnectDelayInMs?: number
  onInvalidMessage?: (message: object) => void
  onReconnect?: () => void
  onError?: (message: object) => void
  onClose?: (message: object) => void
}

const noop = () => {
  return
}

type Resolver<T> = (value?: T | PromiseLike<T>) => void
type Rejecter = (reason?: any) => void

const DEFAULT_RECONNECT_DELAY_IN_MS = 5000

class DefaultEoswsSocket implements EoswsSocket {
  public isConnected: boolean = false
  public socket?: any // FIXME: See comment on type `WebSocketFactory` for details

  private socketFactory: WebSocketFactory
  private options: SocketOptions
  private listener?: SocketMessageListener

  private connectionPromise?: Promise<void>
  private connectionPromiseResolver?: Resolver<void>
  private connectionPromiseRejecter?: Rejecter

  private successfulConnectionCount = 0

  private debug: IDebugger

  public constructor(socketFactory: WebSocketFactory, options: SocketOptions) {
    this.socketFactory = socketFactory
    this.options = options

    this.debug = debugFactory("eosws:socket" + (options.id !== undefined ? `:${options.id}` : ""))
  }

  public async connect(listener: SocketMessageListener): Promise<void> {
    this.debug("About to connect to remote endpoint.")

    if (this.connectionPromise !== undefined) {
      return this.connectionPromise
    }

    this.listener = listener
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.debug("Connection promise started, creating and opening socket.")
      this.socket = this.createAnOpenSocket(
        this.onSocketConnectOpenFactory(resolve),
        this.onSocketErrorFactory(reject)
      )
    })

    this.debug("Connection to remote endpoint initialized, returning promise to caller.")
    return this.connectionPromise
  }

  public async disconnect(): Promise<void> {
    this.debug("About to disconnect from remote endpoint.")
    this.listener = undefined

    if (this.socket !== undefined && !this.isConnected) {
      this.debug("Socket not closed, closing it.")
      this.socket.close()
    }

    this.debug("Performing disconnection clean up.")
    this.cleanSocket()
    this.isConnected = false
  }

  public async send<T>(message: OutboundMessage<T>): Promise<boolean> {
    if (!this.isConnected) {
      this.debug("Not connected, re-connecting prior sending message.")
      await this.reconnect()
    }

    if (!this.isConnected) {
      this.debug("Socket not connected, unable to send message correctly.")
      return false
    }

    this.debug("Sending message %O through socket.", message)
    this.socket!.send(JSON.stringify(message))
    return true
  }

  private createAnOpenSocket<T>(
    onSocketOpen: () => void,
    onSocketError: (event: Event) => void
  ): WebSocket {
    const socket = this.socketFactory()
    socket.onopen = onSocketOpen
    socket.onerror = onSocketError
    socket.onclose = this.onSocketClose
    socket.onmessage = this.onSocketMessage

    return socket
  }

  private onSocketConnectOpenFactory = (resolve: Resolver<void>) => () => {
    this.debug("Received `onopen` (via connect) notification from socket.")
    this.isConnected = true
    this.connectionPromise = undefined

    this.debug("Signaling completion of `connect` method in the outer scope.")
    resolve()
  }

  private onSocketReconnectOpenFactory = (resolve: Resolver<boolean>) => () => {
    this.debug("Received `onopen` (via reconnect) notification from socket.")
    this.isConnected = true

    this.debug("Signaling completion of `reconnect` method in the outer scope.")
    resolve(true)

    this.debug("Sending a `onReconnect` notification to client consumer.")
    this.onReconnect()
  }

  private onSocketErrorFactory = (reject: Rejecter) => (event: Event) => {
    this.debug("Received `onerror` notification from socket.")
    this.isConnected = false

    this.debug("Signaling rejection of `connect` method in the outer scope.")
    reject(event)

    this.debug("Sending an `onError` notification to client consumer.")
    this.onError(event)
  }

  private onSocketClose = (event: CloseEvent) => {
    this.debug("Received `onclose` notification from socket.")
    this.isConnected = false
    this.cleanSocket()
    this.connectionPromise = undefined

    this.debug("Sending a `onReconnect` notification to client consumer.")
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

    if (this.listener) {
      this.listener(payload as InboundMessage<any>)
    }
  }

  private canHandleType(type: string) {
    const actualType = (type || "").toLowerCase()
    const validTypes = Object.keys(InboundMessageType).map((value) => value.toLowerCase())

    // We know that in the Enum, keys are the same as the type values, so this works
    return validTypes.indexOf(actualType) > -1
  }

  private async reconnect(): Promise<boolean> {
    if (this.connectionPromise) {
      try {
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
        this.socket = this.createAnOpenSocket(
          this.onSocketReconnectOpenFactory(resolve),
          this.onSocketErrorFactory(reject)
        )
      }, reconnectDelay)
    })
  }

  private cleanSocket() {
    if (this.socket === undefined) {
      return
    }

    this.socket.onopen = noop
    this.socket.onclose = noop
    this.socket.onerror = noop
    this.socket.onmessage = noop
    this.socket = undefined
  }

  private cleanConnectionPromise() {
    this.connectionPromise = undefined
    this.connectionPromiseRejecter = undefined
    this.connectionPromiseResolver = undefined
  }

  private onInvalidMessage(message: object) {
    ;(this.options.onInvalidMessage || noop)(message)
  }

  private onReconnect() {
    ;(this.options.onReconnect || noop)()
  }

  private onClose(message: any) {
    ;(this.options.onClose || noop)(message)
  }

  private onError(message: any) {
    ;(this.options.onError || noop)(message)
  }
}
