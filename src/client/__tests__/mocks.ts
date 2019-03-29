import { ApiTokenInfo } from "../../types/auth-token"
import { ApiTokenStore } from "../api-token-store"
import { RefreshScheduler, ScheduleJob } from "../refresh-scheduler"
import { Socket, SocketMessageListener, WebSocket } from "../../types/socket"
import { OutboundMessage } from "../../message/outbound"
import { StreamClient, OnStreamMessage } from "../../types/stream-client"
import { HttpClient, HttpQueryParameters } from "../../types/http-client"
import { Stream } from "../../types/stream"

export class MockHttpClient implements HttpClient {
  public authRequestMock = jest.fn<Promise<any>>(() => Promise.resolve())
  public apiRequestMock = jest.fn<Promise<any>>(() => Promise.resolve())

  public authRequest<T>(
    path: string,
    method: string,
    params?: HttpQueryParameters,
    body?: any
  ): Promise<T> {
    return this.authRequestMock(path, method, params, body)
  }

  public apiRequest<T>(
    apiToken: string,
    path: string,
    method: string,
    params?: HttpQueryParameters,
    body?: any
  ): Promise<T> {
    return this.apiRequestMock(apiToken, path, method, params, body)
  }
}

export class MockStreamClient implements StreamClient {
  public registerStreamMock = jest.fn<Promise<Stream>>(() => Promise.resolve())
  public unregisterStreamMock = jest.fn<Promise<void>>(() => Promise.resolve())

  public socket: MockSocket = new MockSocket()

  public registerStream(message: OutboundMessage, onMessage: OnStreamMessage): Promise<Stream> {
    return this.registerStreamMock(message, onMessage)
  }

  public unregisterStream(id: string): Promise<void> {
    return this.unregisterStreamMock(id)
  }
}

export class MockSocket implements Socket {
  public isConnectedMock = jest.fn<boolean>(() => true)
  public connectMock = jest.fn<Promise<void>>()
  public disconnectMock = jest.fn<Promise<void>>()
  public sendMock = jest.fn<Promise<boolean>>()
  public setApiTokenMock = jest.fn<void>()

  public getMock = jest.fn<Promise<ApiTokenInfo | undefined>>()

  public get isConnected(): boolean {
    return this.isConnectedMock()
  }

  public connect(
    listener: SocketMessageListener,
    options: { onReconnect?: () => void } = {}
  ): Promise<void> {
    return this.connectMock(listener, options)
  }

  public disconnect(): Promise<void> {
    return this.disconnectMock()
  }

  public send<T>(message: OutboundMessage<T>): Promise<void> {
    return this.sendMock(message)
  }

  public setApiToken(apiToken: string): void {
    return this.setApiTokenMock(apiToken)
  }
}

export class MockWebSocket implements WebSocket {
  public readonly CLOSED = 0
  public readonly CLOSING = 0
  public readonly CONNECTING = 0
  public readonly OPEN = 0

  public readonly readyState: number
  public readonly protocol: string
  public readonly url: string

  public onclose?: (event: any) => any
  public onerror?: (event: any) => any
  public onmessage?: (event: any) => any
  public onopen?: (event: any) => any

  public closeMock = jest.fn<void>()
  public sendMock = jest.fn<string | ArrayBufferLike | Blob | ArrayBufferView>()

  constructor(url: string) {
    // Our mock does not move around those states, there only to please TypeScript
    this.readyState = this.CLOSED
    this.protocol = ""
    this.url = url
  }

  public close() {
    this.closeMock()
  }

  public send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    this.sendMock(data)
  }
}

export class MockApiTokenStore implements ApiTokenStore {
  public setMock = jest.fn<Promise<void>>()
  public getMock = jest.fn<Promise<ApiTokenInfo | undefined>>()

  public set(apiTokenInfo: ApiTokenInfo): Promise<void> {
    return this.setMock(apiTokenInfo)
  }

  public get(): Promise<ApiTokenInfo | undefined> {
    return this.getMock()
  }
}

export class MockRefreshScheduler implements RefreshScheduler {
  public hasScheduledJobMock = jest.fn<boolean>()
  public scheduleMock = jest.fn<void>()

  public hasScheduledJob(): boolean {
    return this.hasScheduledJobMock()
  }

  public schedule(delayInSeconds: number, job: ScheduleJob): void {
    this.scheduleMock(delayInSeconds, job)
  }
}
