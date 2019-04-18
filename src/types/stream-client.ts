import { InboundMessage } from "../message/inbound"
import { OutboundMessage } from "../message/outbound"
import { Socket } from "./socket"
import { Stream } from "./stream"

/**
 * @group Interfaces
 */
export interface StreamClient {
  socket: Socket

  registerStream(message: OutboundMessage, onMessage: OnStreamMessage): Promise<Stream>
  unregisterStream(id: string): Promise<void>
}

export type OnStreamMessage = (message: InboundMessage) => void
export type OnStreamRestart = () => void
