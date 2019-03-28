import debugFactory, { IDebugger } from "debug"
import { SocketOptions, createSocket } from "./socket"
import { OutboundMessage, unlistenMessage } from "../message/outbound"
import { InboundMessage } from "../message/inbound"
import { DfuseClientError } from "../types/error"
import { StreamClient, OnStreamMessage, Stream } from "../types/stream-client"
import { Socket } from "../types/socket"

export type StreamClientOptions = {
  socket?: Socket
  socketOptions?: SocketOptions
}

export function createStreamClient(wsUrl: string, options: StreamClientOptions = {}): StreamClient {
  return new DefaultStreamClient(options.socket || createSocket(wsUrl, options.socketOptions))
}

class DefaultStreamClient {
  public socket: Socket

  private streams: { [id: string]: StreamTracker } = {}
  private debug: IDebugger = debugFactory("dfuse:stream")

  constructor(socket: Socket) {
    this.socket = socket
  }

  public async registerStream(
    message: OutboundMessage,
    onMessage: OnStreamMessage
  ): Promise<Stream> {
    if (Object.keys(this.streams).length <= 0) {
      this.debug("No prior stream present, connecting socket first.")
      await this.socket.connect(this.handleMessage)
    }

    const id = message.req_id
    if (this.streams[id] !== undefined) {
      throw new DfuseClientError(
        `A stream with id '${id}' is already registered, cannot register another one with the same id`
      )
    }

    this.debug("Registering stream [%s] with message %o.", id, message)

    // Let's first register stream to ensure that if messages arrives before we got back
    // execution flow after `send` call, the listener is already present to handle message
    this.streams[id] = {
      onMessage,
      subscriptionMessage: message
    }

    // The implementation of the method will perform the stream clean up in case of an error
    await this.sendRegisterMessage(id, message)

    this.debug("Stream [%s] registered with remote endpoint.", id)
    return {
      id,
      unlisten: async () => this.unregisterStream(id)
    }
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

  private sendRegisterMessage = async (streamId: string, message: OutboundMessage) => {
    try {
      await this.socket.send(message)
    } catch (error) {
      delete this.streams[streamId]
      throw new DfuseClientError(`Unable to correctly register stream '${streamId}'`, error)
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

  public setApiToken(apiToken: string): void {
    this.socket.setApiToken(apiToken)
  }
}

interface StreamTracker {
  onMessage: OnStreamMessage
  subscriptionMessage: OutboundMessage

  blockNum?: number
  blockId?: string
}
