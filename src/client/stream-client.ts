import debugFactory, { IDebugger } from "debug"
import { SocketOptions, createSocket } from "./socket"
import { OutboundMessage, unlistenMessage } from "../message/outbound"
import { InboundMessage, InboundMessageType } from "../message/inbound"
import { DfuseClientError } from "../types/error"
import { StreamClient, OnStreamMessage, OnStreamRestart } from "../types/stream-client"
import { Socket } from "../types/socket"
import { Stream, StreamMarker } from "../types/stream"
import { Deferred } from "../helpers/promises"

/**
 * The set of options that can be used when constructing a the default
 * [[StreamClient]] instance through the [[createStreamClient]] factory
 * method.
 */
export interface StreamClientOptions {
  /**
   * The [[Socket]] instance to use, inferred based on the environment when not provided.
   *
   * @default `undefined` (Inferred based on runtime environment (Node.js/Browser), see [[createSocket]])
   */
  socket?: Socket

  /**
   * The [[SocketOptions]] to pass when creating the default [[Socket]] instance.
   * This field has no effect if you provide yourself a [[StreamClientOptions.socket]] option.
   *
   * @default `undefined` (See [[SocketOptions]] for actual defaults this generates)
   */
  socketOptions?: SocketOptions

  /**
   * Determines all streams should automatically restart when the socket disconnects. The stream
   * will re-connect at their latest marked value (See [[Stream.mark]]) if present or at current
   * block if it was never marked.
   *
   * @default `true`
   */
  autoRestartStreamsOnReconnect?: boolean

  /**
   * When sets to `true`, when no more streams are active, the socket is
   * automatically disconnected and close. This option should be set to
   * `false` when using `Query` or `Mutation` over WebSocket transport
   * to avoid opening/closing the WebSocket connection for each operation
   * or when multiple short lived `Subscription`s are used.
   *
   * @default `true`
   */
  autoDisconnectSocket?: boolean
}

/**
 * Create the default [[StreamClient]] concrete implementation.
 *
 * @param wsUrl The url used to reach the dfuse Stream API, should **not** contain the `token` query parameter. Passed as
 * is to created [[Socket]] interface through the [[createSocket]] factory method. This parameter has no effect
 * if [[StreamClientOptions.socket]] options is used.
 * @param options The set of options used to construct the default [[StreamClient]] instance. See
 * [[StreamClientOptions]] for documentation of the options and default values for each of them.
 */
export function createStreamClient(wsUrl: string, options: StreamClientOptions = {}): StreamClient {
  return new DefaultStreamClient(
    options.socket || createSocket(wsUrl, { id: "stream", ...options.socketOptions }),
    options.autoRestartStreamsOnReconnect === undefined
      ? true
      : options.autoRestartStreamsOnReconnect,
    options.autoDisconnectSocket === undefined ? true : options.autoDisconnectSocket
  )
}

class DefaultStreamClient {
  private socket: Socket
  private autoRestartStreamsOnReconnect: boolean
  private autoDisconnectSocket: boolean
  private debug: IDebugger = debugFactory("dfuse:stream")
  private debugTrace: IDebugger = debugFactory("dfuse-trace:stream")

  private streams: { [id: string]: DefaultStream } = {}

  constructor(
    socket: Socket,
    autoRestartStreamsOnReconnect: boolean,
    autoDisconnectSocket: boolean
  ) {
    this.socket = socket
    this.autoRestartStreamsOnReconnect = autoRestartStreamsOnReconnect
    this.autoDisconnectSocket = autoDisconnectSocket
  }

  public release(): void {
    this.debug("Releasing default stream client")
    this.socket.disconnect().catch((error) => {
      this.debug(
        "An error occurred while disconnecting from socket while releasing instance",
        error
      )
    })
  }

  public setApiToken(apiToken: string): void {
    this.socket.setApiToken(apiToken)
  }

  public async registerStream(
    message: OutboundMessage,
    onMessage: OnStreamMessage
  ): Promise<Stream> {
    if (!this.socket.isConnected) {
      this.debug("Socket is not connected, connecting socket first.")
      await this.socket.connect(this.handleMessage, { onReconnect: this.handleReconnection })
    }

    const id = message.req_id
    if (this.streams[id] !== undefined) {
      throw new DfuseClientError(
        `A stream with id '${id}' is already registered, cannot register another one with the same id`
      )
    }

    this.debug("Registering stream [%s] with message %o.", id, message)
    const streamExists = (streamId: string): boolean => this.streams[streamId] !== undefined
    const unregisterStream = (streamId: string): Promise<void> => this.unregisterStream(streamId)
    const stream = new DefaultStream(
      id,
      message,
      onMessage,
      streamExists,
      unregisterStream,
      this.socket,
      this.debug.extend(id, ":")
    )

    // Let's first register stream to ensure that if messages arrives before we got back
    // execution flow after `send` call, the listener is already present to handle message
    this.streams[id] = stream

    try {
      await stream.start()
    } catch (error) {
      delete this.streams[id]
      throw new DfuseClientError(`Unable to correctly register stream '${id}'`, error)
    }

    this.debug("Stream [%s] registered with remote endpoint.", id)
    return stream
  }

  public async unregisterStream(id: string): Promise<void> {
    if (this.streams[id] === undefined) {
      this.debug("Stream [%s] is already unregistered, nothing to do.", id)
      return
    }

    const message = unlistenMessage({ req_id: id })
    this.debug("Unregistering stream [%s] with message %o.", id, message)

    delete this.streams[id]

    if (this.socket.isConnected) {
      await this.socket.send(message)
    }

    if (Object.keys(this.streams).length <= 0 && this.autoDisconnectSocket) {
      this.debug("No more stream present, disconnecting socket.")
      if (this.socket.isConnected) {
        await this.socket.disconnect()
      }
    }
  }

  private handleMessage = (rawMessage: unknown): void => {
    const message = rawMessage as InboundMessage

    if (message.type === "ping") {
      this.debug("Discarding 'ping' message from reaching the underlying stream(s).")
      return
    }

    let debug = this.debugTrace
    if (
      message.type === InboundMessageType.ERROR ||
      message.type === InboundMessageType.LISTENING ||
      message.type === InboundMessageType.UNLISTENED
    ) {
      debug = this.debug
    }

    debug(
      "Routing socket message of type '%s' with req_id '%s' to appropriate stream",
      message.type,
      message.req_id
    )
    const stream = this.streams[message.req_id || ""]
    if (stream === undefined) {
      this.debug(
        "No stream currently registered able to handle message with req_id '%s'",
        message.req_id
      )
      return
    }

    stream.onMessage(message, stream)
  }

  private handleReconnection = (): void => {
    if (this.autoRestartStreamsOnReconnect === false) {
      return
    }

    Object.keys(this.streams).forEach((streamId) => {
      this.streams[streamId].restart()
    })
  }
}

class DefaultStream implements Stream {
  public readonly id: string
  public onPostRestart?: OnStreamRestart

  private activeMarker?: StreamMarker
  private activeJoiner?: Deferred<void>
  private registrationMessage: OutboundMessage
  private onMessageHandler: OnStreamMessage
  private unregisterStream: (id: string) => Promise<void>
  private streamExists: (id: string) => boolean
  private socket: Socket
  private debug: IDebugger

  constructor(
    id: string,
    registrationMessage: OutboundMessage,
    onMessage: OnStreamMessage,
    streamExists: (id: string) => boolean,
    unregisterStream: (id: string) => Promise<void>,
    socket: Socket,
    debug: IDebugger
  ) {
    this.id = id
    this.registrationMessage = registrationMessage
    this.onMessageHandler = onMessage
    this.streamExists = streamExists
    this.unregisterStream = unregisterStream
    this.socket = socket
    this.debug = debug
  }

  public get onMessage(): OnStreamMessage {
    return this.onMessageHandler
  }

  public currentActiveMarker(): StreamMarker | undefined {
    return this.activeMarker
  }

  public async start(): Promise<void> {
    return this.socket.send(this.registrationMessage)
  }

  public async restart(marker?: StreamMarker): Promise<void> {
    this.checkMarker(marker)

    if (!this.streamExists(this.id)) {
      throw new DfuseClientError(
        `Trying to restart a stream '${this.id}' that is not registered anymore or was never registered`
      )
    }

    let activeMarker = this.activeMarker
    if (marker) {
      activeMarker = marker
    }

    const restartMessage = { ...this.registrationMessage }
    if (activeMarker) {
      restartMessage.start_block = (activeMarker as any).atBlockNum
    }

    await this.socket.send(restartMessage)

    if (this.onPostRestart) {
      this.onPostRestart()
    }
  }

  public async join(): Promise<void> {
    if (this.activeJoiner !== undefined) {
      return this.activeJoiner.promise()
    }

    this.activeJoiner = new Deferred()

    return this.activeJoiner.promise()
  }

  public mark(marker: StreamMarker): void {
    this.activeMarker = this.checkMarker(marker)
  }

  public async close(options: { error?: Error } = {}): Promise<void> {
    return (
      this.unregisterStream(this.id)
        .then(() => {
          if (options.error) {
            this.reject(options.error)
          } else {
            this.resolve()
          }
          return
        })
        // FIXME: We should probably return a MultiError of some kind to report both error if `options.error` exists
        .catch(this.reject)
    )
  }

  private checkMarker(marker?: StreamMarker): StreamMarker | undefined {
    if (!marker) {
      return undefined
    }

    if (!(marker as any).atBlockNum || (marker as any).atBlockNum < 0) {
      throw new DfuseClientError(
        "Only non-zero & positive `atBlockNum` markers are accepted for this operation"
      )
    }

    return marker
  }

  private resolve = (): void => {
    if (this.activeJoiner) {
      this.debug("Resolving joiner promise.")
      this.activeJoiner.resolve()
      this.activeJoiner = undefined
    }
  }

  private reject = (error: Error): void => {
    if (this.activeJoiner) {
      this.debug("Rejecting joiner promise with error %o.", error)
      this.activeJoiner.reject(error)
      this.activeJoiner = undefined
    }
  }
}
