import { InboundMessage } from "../message/inbound"
import { OutboundMessage } from "../message/outbound"
import { Socket } from "./socket"

export interface StreamClient {
  socket: Socket

  registerStream(message: OutboundMessage<any>, onMessage: OnStreamMessage): Promise<Stream>
  unregisterStream(id: string): Promise<void>

  setApiToken(apiToken: string): void
}

export interface Stream {
  id: string
  unlisten(): Promise<void>
}

export type OnStreamMessage = (message: InboundMessage<any>) => void
