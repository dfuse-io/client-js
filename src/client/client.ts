import { EoswsSocket, SocketMessageListener } from "./socket"
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
import { EoswsListeners } from "./listeners"

interface HttpBody {
  readonly body: any | null
  readonly bodyUsed: boolean
  arrayBuffer(): Promise<any>
  blob(): Promise<any>
  formData(): Promise<any>
  json(): Promise<any>
  text(): Promise<string>
}

interface HttpResponse extends HttpBody {
  readonly headers: any
  readonly ok: boolean
  readonly redirected: boolean
  readonly status: number
  readonly statusText: string
  readonly trailer: Promise<any>
  readonly type: string
  readonly url: string
  clone(): HttpResponse | undefined
}

/**
 * Represents a single WebSocket stream operation against the client. This is what
 * you actually as return type of calling one of the listening operator like
 * `getActionTraces`, `getTableRows`, `getTransactionLifecycle` and other
 * stream listening method.
 */
export interface EoswsStream {
  onMessage: (callback: SocketMessageListener) => void
  reqId: string
  unlisten: () => void
}

export interface ApiTokenInfo {
  token: string
  expires_at: number
}

export interface EoswsClientParams {
  socket: EoswsSocket
  baseUrl: string
  httpClient?: HttpClient
}

export type HttpClient = (url: string, options?: any) => Promise<HttpResponse>

export class EoswsClient {
  public socket: EoswsSocket
  public listeners: EoswsListeners
  public baseUrl: string
  private httpClient?: HttpClient = typeof fetch !== "undefined" ? fetch : undefined

  constructor(params: EoswsClientParams) {
    this.socket = params.socket
    this.listeners = new EoswsListeners()
    this.baseUrl = params.baseUrl
    if (params.httpClient) {
      this.httpClient = params.httpClient
    }
    if (!this.httpClient) {
      throw new Error(
        "The httpClient cannot be undefined, the default value 'fetch' is not defined in this context"
      )
    }
  }

  public async getNewApiToken(apiKey: string): Promise<ApiTokenInfo> {
    const response = await this.httpClient!(`${this.baseUrl}/v1/auth/issue`, {
      method: "post",
      body: JSON.stringify({ api_key: apiKey })
    })
    return (await response.json()) as ApiTokenInfo
  }

  public connect(): Promise<void> {
    return this.socket.connect((message: InboundMessage<any>) => {
      this.listeners.handleMessage(message)
    })
  }

  public async reconnect(): Promise<void> {
    if (this.socket && this.socket.isConnected) {
      await this.disconnect()
    }
    await this.connect()

    // Re-subscribe to all streams!
    this.listeners.resubscribeAll(this)
  }

  public disconnect(): Promise<void> {
    return this.socket.disconnect()
  }

  public getActionTraces(
    data: GetActionTracesMessageData,
    options: StreamOptions = {}
  ): EoswsStream {
    options = mergeDefaultsStreamOptions(options, {
      listen: true
    })

    return this.createListenerWithSend(getActionTracesMessage(data, options))
  }

  public getTableRows(
    parameters: GetTableRowsMessageData,
    options: StreamOptions = {}
  ): EoswsStream {
    options = mergeDefaultsStreamOptions(options, {
      listen: true
    })

    return this.createListenerWithSend(getTableRowsMessage(parameters, options))
  }

  public getTransactionLifecycle(id: string, options: StreamOptions = {}): EoswsStream {
    options = mergeDefaultsStreamOptions(options, {
      fetch: true,
      listen: true
    })

    return this.createListenerWithSend(getTransactionLifecycleMessage({ id }, options))
  }

  private createListenerWithSend(message: OutboundMessage<any>): EoswsStream {
    const reqId = message.req_id!
    const onMessage = (callback: SocketMessageListener) => {
      this.listeners.addListener({ reqId, callback, subscriptionMessage: message })
      this.socket.send(message)
    }

    return {
      onMessage,
      reqId,
      unlisten: () => this.unlisten(reqId)
    }
  }

  private unlisten(requestId: string) {
    this.listeners.removeListener(requestId)
    this.socket.send(unlistenMessage({ req_id: requestId }))
  }
}

function randomReqId() {
  return `r${Math.random()
    .toString(16)
    .substr(2)}`
}

function mergeDefaultsStreamOptions(
  userDefinedOptions: StreamOptions,
  defaultOptions: StreamOptions
): StreamOptions {
  return Object.assign({ req_id: randomReqId() }, defaultOptions, userDefinedOptions)
}
