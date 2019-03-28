import { ApiTokenInfo } from "../../types/auth-token"
import { ApiTokenStore } from "../api-token-store"
import { RefreshScheduler, ScheduleJob } from "../refresh-scheduler"
import { Socket, SocketMessageListener } from "../../types/socket"
import { OutboundMessage } from "../../message/outbound"
import { StreamClient, OnStreamMessage, Stream } from "../../types/stream-client"
import { HttpClient, HttpQueryParameters } from "../../types/http-client"

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
  public setApiTokenMock = jest.fn<void>()

  public socket: MockSocket = new MockSocket()

  public registerStream(message: OutboundMessage, onMessage: OnStreamMessage): Promise<Stream> {
    return this.registerStreamMock(message, onMessage)
  }

  public unregisterStream(id: string): Promise<void> {
    return this.unregisterStreamMock(id)
  }

  public setApiToken(apiToken: string): void {
    this.setApiTokenMock(apiToken)
  }
}

export class MockSocket implements Socket {
  public isConnectedMock = jest.fn<boolean>()
  public connectMock = jest.fn<Promise<void>>()
  public disconnectMock = jest.fn<Promise<void>>()
  public sendMock = jest.fn<Promise<boolean>>()
  public setApiTokenMock = jest.fn<void>()

  public getMock = jest.fn<Promise<ApiTokenInfo | undefined>>()

  public get isConnected(): boolean {
    return this.isConnectedMock()
  }

  public connect(listener: SocketMessageListener): Promise<void> {
    return this.connectMock(listener)
  }

  public disconnect(): Promise<void> {
    return this.disconnectMock()
  }

  public send<T>(message: OutboundMessage<T>): Promise<boolean> {
    return this.sendMock(message)
  }

  public setApiToken(apiToken: string): void {
    return this.setApiTokenMock(apiToken)
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
