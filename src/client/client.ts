import debugFactory, { IDebugger } from "debug"

import { OutboundMessage } from "./outbound"
import { InboundMessage, InboundMessageType } from "./inbound"

export type SocketFactory = () => WebSocket

export function createClient(
  socketFactory: SocketFactory,
  options: ClientOptions = {
    autoReconnect: true
  }
) {
  return new WebSocketClient(socketFactory, options)
}

export interface Client {
  isConnected: boolean

  connect(listener: ClientMessageListener): Promise<void>
  disconnect(): Promise<void>

  send<T>(message: OutboundMessage<T>): Promise<boolean>
}

export type ClientMessageListener = (type: InboundMessageType, message: InboundMessage<any>) => void

export interface ClientOptions {
  id?: string
  autoReconnect?: boolean
  onInvalidMessage?: (message: object) => void
  onReconnect?: () => void
  onError?: () => void
  onClose?: () => void
}

const noop = () => {
  return
}

type Resolver<T> = (value?: T | PromiseLike<T>) => void
type Rejecter = (reason?: any) => void

class WebSocketClient implements Client {
  public isConnected: boolean = false
  public socket?: WebSocket

  private socketFactory: SocketFactory
  private options: ClientOptions
  private listener?: ClientMessageListener

  private connectionPromise?: Promise<void>
  private connectionPromiseResolver?: Resolver<void>
  private connectionPromiseRejecter?: Rejecter

  private successfulConnectionCount = 0

  private debug: IDebugger

  public constructor(socketFactory: SocketFactory, options: ClientOptions) {
    this.socketFactory = socketFactory
    this.options = options

    this.debug = debugFactory("eosws:client" + (options.id !== undefined ? `:${options.id}` : ""))
  }

  public async connect(listener: ClientMessageListener): Promise<void> {
    this.listener = listener

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.connectionPromiseResolver = resolve
      this.connectionPromiseRejecter = reject

      this.socket = this.createAnOpenSocket()
    })

    return this.connectionPromise
  }

  public async disconnect(): Promise<void> {
    this.listener = undefined

    if (this.socket !== undefined && !this.isConnected) {
      this.socket.close()
    }

    this.cleanSocket()
    this.successfulConnectionCount = 0
    this.isConnected = false
  }

  public async send<T>(message: OutboundMessage<T>): Promise<boolean> {
    if (!this.isConnected) {
      this.debug("Not connected, re-connection prior sending message.")
      await this.reconnect()
    }

    if (!this.isConnected) {
      this.debug("Socket not connected, unable to send message correclty.")
      return false
    }

    this.debug("Sending message %O through socket.", message)
    this.socket!.send(JSON.stringify(message))
    return true
  }

  private createAnOpenSocket(): WebSocket {
    const socket = this.socketFactory()
    socket.onopen = this.onSocketOpen
    socket.onerror = this.onSocketError
    socket.onclose = this.onSocketClose
    socket.onmessage = this.onSocketMessage

    return socket
  }

  private onSocketOpen = () => {
    this.debug("Received `onopen` notification from socket.")
    this.isConnected = true

    if (this.connectionPromiseResolver) {
      this.debug("Signaling completion of `connect` method in the outer scope.")
      this.connectionPromiseResolver()
    }

    if (this.successfulConnectionCount > 0) {
      this.debug(
        "Previously seen a successfull `connect`, so we got `onopen` because of a reconnection."
      )
      this.debug("Sending a `onReconnect` notification to client consumer.")
      this.onReconnect()
    }

    this.cleanConnectionPromise()
    this.successfulConnectionCount++
  }

  private onSocketClose = (event: CloseEvent) => {
    this.debug("Received `onclose` notification from socket.")
    this.isConnected = false
    this.cleanSocket()

    this.debug("Sending a `onReconnect` notification to client consumer.")
    this.onClose()

    if (event.code !== 1000 && event.code !== 1005) {
      this.debug(
        "Socket error code is not [FIXME FIND CODE REASON], trying to re-connect to socket."
      )
      this.reconnect()
    }
  }

  private onSocketError = (event: Event) => {
    this.debug("Received `onerror` notification from socket.")
    this.isConnected = false

    if (this.connectionPromiseRejecter) {
      this.debug("Signaling rejection of `connect` method in the outer scope.")
      this.connectionPromiseRejecter(event)
    }

    this.debug("Sending an `onError` notification to client consumer.")
    this.onError()
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
      this.listener(type, payload as InboundMessage<any>)
    }
  }

  private canHandleType(type: string) {
    const actualType = (type || "").toLowerCase()
    const validTypes = Object.keys(InboundMessageType).map((value) => value.toLowerCase())

    // We know that in the Enum, keys are the same as the type values, so this works
    return validTypes.indexOf(actualType) > -1
  }

  private async reconnect(): Promise<void> {
    if (!this.options.autoReconnect) {
      this.debug("Not re-connecting because client consumer auto reconnect option is falsy.")
      return
    }

    if (this.connectionPromise) {
      // FIXME: Handle errors ...
      await this.connectionPromise
    }

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.connectionPromiseResolver = resolve
      this.connectionPromiseRejecter = reject

      this.socket = this.createAnOpenSocket()
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

  private onClose() {
    ;(this.options.onClose || noop)()
  }

  private onError() {
    ;(this.options.onError || noop)()
  }
}
