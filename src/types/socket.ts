import { InboundMessage } from "../message/inbound"
import { OutboundMessage } from "../message/outbound"

/**
 * @group Interfaces
 */
export interface Socket {
  isConnected: boolean

  connect(listener: SocketMessageListener, options?: { onReconnect?: () => void }): Promise<void>
  disconnect(): Promise<void>

  send<T>(message: OutboundMessage<T>): Promise<void>

  /**
   * Assigns a new API token to the stream client instance meaning the
   * previous one is not good anymore.
   *
   * This usualy indicates the previous token is not valid anymore. This
   * does not re-trigger a re-connection automatically.
   *
   * Instead, it should change the internal state of the [[Socket]] instance,
   * and once a re-connection is requested (by the client or by the server),
   * the new API token should be used to re-construct the WebSocket url to
   * contact.
   *
   * @param apiToken The new API token that should be now set as the active token
   */
  setApiToken(apiToken: string): void
}

export type SocketMessageListener = (message: InboundMessage) => void

/**
 * This is copied here because the actual WebSocket is defined differently
 * under a Node.js environment then in a Browser environment. As such,
 * importing one or the other causes problem and used in the wrong
 * environment.
 *
 * To avoid problem, we define a small interface of what we really use
 * inside the library. It's the only part's that are needed.
 *
 * @ignore
 */
export type WebSocket = {
  onclose?: ((this: WebSocket, ev: any) => any) | null
  onerror?: ((this: WebSocket, ev: any) => any) | null
  onmessage?: ((this: WebSocket, ev: any) => any) | null
  onopen?: ((this: WebSocket, ev: any) => any) | null

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
