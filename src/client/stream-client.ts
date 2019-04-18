import debugFactory, { IDebugger } from "debug"
import { SocketOptions, createSocket } from "./socket"
import { OutboundMessage, unlistenMessage } from "../message/outbound"
import { InboundMessage } from "../message/inbound"
import { DfuseClientError } from "../types/error"
import { StreamClient, OnStreamMessage } from "../types/stream-client"
import { Socket } from "../types/socket"
import { Stream, StreamMarker } from "../types/stream"

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
}

export function createStreamClient(wsUrl: string, options: StreamClientOptions = {}): StreamClient {
  return new DefaultStreamClient(
    options.socket || createSocket(wsUrl, options.socketOptions),
    options.autoRestartStreamsOnReconnect === undefined
      ? true
      : options.autoRestartStreamsOnReconnect
  )
}

class DefaultStreamClient {
  public socket: Socket

  // Public only for tighly coupled Stream to be able to query current state of Streams
  public streams: { [id: string]: DefaultStream } = {}
  private autoRestartStreamsOnReconnect: boolean
  private debug: IDebugger = debugFactory("dfuse:stream")

  constructor(socket: Socket, autoRestartStreamsOnReconnect: boolean) {
    this.socket = socket
    this.autoRestartStreamsOnReconnect = autoRestartStreamsOnReconnect
  }

  public async registerStream(
    message: OutboundMessage,
    onMessage: OnStreamMessage
  ): Promise<Stream> {
    if (Object.keys(this.streams).length <= 0) {
      this.debug("No prior stream present, connecting socket first.")
      await this.socket.connect(this.handleMessage, { onReconnect: this.handleReconnection })
    }

    const id = message.req_id
    if (this.streams[id] !== undefined) {
      throw new DfuseClientError(
        `A stream with id '${id}' is already registered, cannot register another one with the same id`
      )
    }

    this.debug("Registering stream [%s] with message %o.", id, message)
    const stream = new DefaultStream(id, message, onMessage, this)

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
    await this.socket.send(message)

    if (Object.keys(this.streams).length <= 0) {
      this.debug("No more stream present, disconnecting socket.")
      await this.socket.disconnect()
    }
  }

  private handleMessage = (message: InboundMessage) => {
    this.debug("Routing socket message of type '%s' to appropriate stream", message.type)
    const stream = this.streams[message.req_id || ""]
    if (stream === undefined) {
      this.debug(
        "No stream currently registered able to handle message with 'req_id: %s'",
        message.req_id
      )
      return
    }

    this.debug(
      "Found stream for 'req_id: %s', forwarding message of type '%s' to stream.",
      message.req_id,
      message.type
    )

    stream.onMessage(message)
  }

  private handleReconnection = () => {
    if (this.autoRestartStreamsOnReconnect === false) {
      return
    }

    Object.keys(this.streams).forEach((streamId) => {
      this.streams[streamId].restart()
    })
  }
}

class DefaultStream implements Stream {
  public id: string
  public activeMarker?: StreamMarker

  private registrationMessage: OutboundMessage
  private onMessageHandler: OnStreamMessage
  private client: DefaultStreamClient

  constructor(
    id: string,
    registrationMessage: OutboundMessage,
    onMessage: OnStreamMessage,
    client: DefaultStreamClient
  ) {
    this.id = id
    this.registrationMessage = registrationMessage
    this.onMessageHandler = onMessage
    this.client = client
  }

  public get onMessage(): OnStreamMessage {
    return this.onMessageHandler
  }

  public async start(): Promise<void> {
    return this.client.socket.send(this.registrationMessage)
  }

  public async restart(marker?: StreamMarker): Promise<void> {
    if (this.client.streams[this.id] === undefined) {
      throw new DfuseClientError(
        `Trying to restart a stream '${
          this.id
        }' that is not registered anymore or was never registered`
      )
    }

    const restartMessage = { ...this.registrationMessage }
    if (marker) {
      restartMessage.start_block = marker.atBlockNum
    } else if (this.activeMarker) {
      restartMessage.start_block = this.activeMarker.atBlockNum
    }

    return this.client.socket.send(restartMessage)
  }

  public mark(options: { atBlockNum: number }) {
    this.activeMarker = options
  }

  public async close(): Promise<void> {
    if (this.client.socket.isConnected) {
      return this.client.unregisterStream(this.id)
    }
  }
}
