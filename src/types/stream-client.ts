import { InboundMessage } from "../message/inbound"
import { OutboundMessage } from "../message/outbound"
import { Socket } from "./socket"

/**
 * @group Interfaces
 */
export interface StreamClient {
  socket: Socket

  registerStream(message: OutboundMessage, onMessage: OnStreamMessage): Promise<Stream>
  unregisterStream(id: string): Promise<void>

  setApiToken(apiToken: string): void
}

export type Stream = {
  id: string
  unlisten(): Promise<void>
}

export type OnStreamMessage = (message: InboundMessage) => void
