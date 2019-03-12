import debugFactory, { IDebugger } from "debug"

import { SocketOptions, createSocket } from "./socket"
import {
  getActionTracesMessage,
  GetActionTracesMessageData,
  getTableRowsMessage,
  GetTableRowsMessageData,
  OutboundMessage,
  StreamOptions,
  unlistenMessage,
  getTransactionLifecycleMessage
} from "../message/outbound"
import { InboundMessage } from "../message/inbound"
import { DfuseError } from "../types/error"
import { StreamClient, OnStreamMessage, Stream } from "../types/stream-client"
import { Socket } from "../types/socket"

export interface StreamClientOptions {
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
    message: OutboundMessage<any>,
    onMessage: OnStreamMessage
  ): Promise<Stream> {
    if (Object.keys(this.streams).length <= 0) {
      this.debug("No prior stream present, connecting socket first.")
      await this.socket.connect(this.handleMessage)
    }

    const id = message.req_id
    if (this.streams[id] !== undefined) {
      throw new DfuseError(
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

    const succeed = await this.socket.send(message)
    if (!succeed) {
      delete this.streams[id]
      // FIXME: Do we really want to throw an error here, this would force all callers
      //        to use a try/catch to be sure the stream worked or not...
      //
      //        Moreover, how do we correclty retrieve the cause.... damn it!
      throw new DfuseError(`Unable to correctly register stream`)
    }

    this.debug("Stream [%s] registered with remote endpoint.", id)
    return {
      id,
      unlisten: () => this.unregisterStream(id)
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

  private handleMessage = (message: InboundMessage<any>) => {
    this.debug("Routing socket message to appropriate stream")

    const stream = this.streams[message.req_id || ""]
    if (stream === undefined) {
      this.debug(
        "No stream currently registered able to handle message with 'req_id: %s'",
        message.req_id
      )
    }

    this.debug(
      "Found stream for 'req_id: %s', forwarding message of type '%s' to stream.",
      message.req_id,
      message.type
    )

    // FIXME: Correctly record block progress for stream
    // if (message.type === InboundMessageType.PROGRESS) {
    //   this.saveBlockProgress(message.req_id, message.data.block_num, message.data.block_id)
    // }

    stream.onMessage(message)
  }

  public setApiToken(apiToken: string): void {
    this.socket.setApiToken(apiToken)
  }
}

interface StreamTracker {
  onMessage: OnStreamMessage
  subscriptionMessage: OutboundMessage<any>

  blockNum?: number
  blockId?: string
}
