import { InboundMessage } from "../message/inbound"
import { OutboundMessage } from "../message/outbound"

/**
 * @group Interfaces
 */
export interface Socket {
  isConnected: boolean

  connect(listener: SocketMessageListener): Promise<void>
  disconnect(): Promise<void>

  send<T>(message: OutboundMessage<T>): Promise<void>

  setApiToken(apiToken: string): void
}

export type SocketMessageListener = (message: InboundMessage) => void

/**
 * @ignore
 */
export type WebSocket = {
  onclose: ((this: WebSocket, ev: any) => any) | null
  onerror: ((this: WebSocket, ev: any) => any) | null
  onmessage: ((this: WebSocket, ev: any) => any) | null
  onopen: ((this: WebSocket, ev: any) => any) | null

  readonly readyState: number
  readonly protocol: string
  readonly url: string

  close(code?: number, reason?: string): void
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void

  readonly CLOSED: number
  readonly CLOSING: number
  readonly CONNECTING: number
  readonly OPEN: number
}

export type WebSocketFactory = (url: string) => Promise<WebSocket>
