export type SocketConnectOptions = {
  onReconnect?: () => void
  onTermination?: () => void
}

/**
 * An abstraction over a WebSocket object to deal more easily with the
 * WebSocket protocol.
 *
 * This interface will usually abstract connection/disconnection as well as
 * dealing with re-connection and disconnection error and handling all events
 * of the WebSocket API (baseline is the W3C WebSocket API).
 *
 * @group Interfaces
 */
export interface Socket {
  /**
   * A property to determine if the current socket implementation is actually
   * connected with the remote endpoint or not. If the [[Socket]] is actually
   * connected, consumer can assume messages can be sent through the WebSocket.
   */
  isConnected: boolean

  /**
   * Perform an actual connection with the remote WebSocket endoint. This
   * will usually construct a `WebSocket` instance and initiate the
   * connection with the remote endpoint.
   *
   * The method receives a listener which will receive all messages
   * sent through the WebSocket by the remote endpoint.
   *
   * @param listener The actual callback that will receive all the messages sent by the
   * remote endpoint through the WebSocket.
   * @param options The options that can be passed to the connect method for certain functionalities.
   * @param options.onReconnect An optional callback than can be passed to be notified **after** the
   * socket has successfully re-connected with the remote endpoint.
   * @param options.onTermination An optional callback than can be passed to be notified when the socket
   * has now terminated, i.e. that it is now disconnected (wheter via a client or server termination)
   * and that it will no try to auto-reconnect anymore.
   */
  connect(listener: SocketMessageListener, options?: SocketConnectOptions): Promise<void>

  /**
   * Disconnects the actual socket. This closes the underlying socket
   * by closing it and clean up all resources.
   */
  disconnect(): Promise<void>

  /**
   * Send a message through the WebSocket. The message is stringified
   * to JSON before being sent to the remote endpoint
   *
   * @param message The actual message to send to the remote endpoint.
   */
  send<T = unknown>(message: T): Promise<void>

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

export type SocketMessageListener = (message: unknown) => void

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
