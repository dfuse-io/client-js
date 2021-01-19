import { ApiTokenInfo } from "../../types/auth-token"
import { ApiTokenStore } from "../api-token-store"
import { RefreshScheduler, ScheduleJob } from "../refresh-scheduler"
import { Socket, SocketMessageListener, WebSocket, SocketConnectOptions } from "../../types/socket"
import { OutboundMessage } from "../../message/outbound"
import { StreamClient, OnStreamMessage } from "../../types/stream-client"
import { HttpClient, HttpQueryParameters, HttpHeaders } from "../../types/http-client"
import { Stream } from "../../types/stream"
import { GraphqlStreamClient, OnGraphqlStreamMessage } from "../../types/graphql-stream-client"
import { GraphqlDocument, GraphqlVariables } from "../../types/graphql"

export function mock<T>(implementation?: (...args: any) => T): jest.Mock<T, any> {
  if (implementation === undefined) {
    return jest.fn() as jest.Mock<T, any>
  }

  return jest.fn<T, any>(implementation)
}

export class MockHttpClient implements HttpClient {
  public releaseMock = mock<void>()
  public authRequestMock = mock<Promise<any>>(() => Promise.resolve())
  public apiRequestMock = mock<Promise<any>>(() => Promise.resolve())

  public release(): void {
    this.releaseMock()
  }

  public authRequest<T>(
    path: string,
    method: string,
    params?: HttpQueryParameters,
    body?: any,
    headers?: HttpHeaders
  ): Promise<T> {
    return this.authRequestMock(path, method, params, body, headers)
  }

  public apiRequest<T>(
    apiToken: string,
    path: string,
    method: string,
    params?: HttpQueryParameters,
    body?: any,
    headers?: HttpHeaders
  ): Promise<T> {
    return this.apiRequestMock(apiToken, path, method, params, body, headers)
  }
}

export class MockGraphqlStreamClient implements GraphqlStreamClient {
  public releaseMock = mock<void>()
  public setApiTokenMock = jest.fn<void, [string]>((/*apiToken: string*/) => {
    return
  })

  public registerStreamMock = mock<Promise<Stream>>()
  public unregisterStreamMock = mock<Promise<void>>(() => Promise.resolve())

  public release(): void {
    this.releaseMock()
  }

  public setApiToken(apiToken: string): void {
    this.setApiTokenMock(apiToken)
  }

  public registerStream<T = unknown>(
    id: string,
    document: GraphqlDocument,
    variables: GraphqlVariables,
    onMessage: OnGraphqlStreamMessage<T>
  ): Promise<Stream> {
    return this.registerStreamMock(id, document, variables, onMessage)
  }

  public unregisterStream(id: string): Promise<void> {
    return this.unregisterStreamMock(id)
  }
}

export class MockStreamClient implements StreamClient {
  public releaseMock = mock<void>()
  public setApiTokenMock = jest.fn<void, [string]>((/*apiToken: string*/) => {
    return
  })

  public registerStreamMock = mock<Promise<Stream>>()
  public unregisterStreamMock = mock<Promise<void>>(() => Promise.resolve())

  public release(): void {
    this.releaseMock()
  }

  public setApiToken(apiToken: string): void {
    this.setApiTokenMock(apiToken)
  }

  public registerStream(message: OutboundMessage, onMessage: OnStreamMessage): Promise<Stream> {
    return this.registerStreamMock(message, onMessage)
  }

  public unregisterStream(id: string): Promise<void> {
    return this.unregisterStreamMock(id)
  }
}

export class MockSocket implements Socket {
  public isConnectedMock = mock<boolean>(() => true)
  public connectMock = mock<Promise<void>>()
  public disconnectMock = mock<Promise<void>>()
  public sendMock = mock<Promise<void>>()
  public setApiTokenMock = mock<void>()

  public getMock = mock<Promise<ApiTokenInfo | undefined>>()

  public get isConnected(): boolean {
    return this.isConnectedMock()
  }

  public connect(
    listener: SocketMessageListener,
    options: { onReconnect?: () => void } = {}
  ): Promise<void> {
    return this.connectMock(listener, options).then(() => {
      this.isConnectedMock.mockReturnValue(true)
      return
    })
  }

  public disconnect(): Promise<void> {
    return this.disconnectMock().then(() => {
      this.isConnectedMock.mockReturnValue(false)
      return
    })
  }

  public send<T = unknown>(message: T): Promise<void> {
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

  public closeMock = mock<void>()
  public sendMock = mock<string | ArrayBufferLike | Blob | ArrayBufferView>()

  constructor(url: string) {
    // Our mock does not move around those states, there only to please TypeScript
    this.readyState = this.CLOSED
    this.protocol = ""
    this.url = url
  }

  public close(): void {
    this.closeMock()
  }

  public send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    this.sendMock(data)
  }
}

export class MockApiTokenStore implements ApiTokenStore {
  public releaseMock = mock<void>()
  public setMock = mock<Promise<void>>()
  public getMock = mock<Promise<ApiTokenInfo | undefined>>()

  public release(): void {
    this.releaseMock()
  }

  public set(apiTokenInfo: ApiTokenInfo): Promise<void> {
    return this.setMock(apiTokenInfo)
  }

  public get(): Promise<ApiTokenInfo | undefined> {
    return this.getMock()
  }
}

export class MockRefreshScheduler implements RefreshScheduler {
  public releaseMock = mock<void>()
  public hasScheduledJobMock = mock<boolean>()
  public scheduleMock = mock<void>()

  public release(): void {
    this.releaseMock()
  }

  public hasScheduledJob(): boolean {
    return this.hasScheduledJobMock()
  }

  public schedule(delayInSeconds: number, job: ScheduleJob): void {
    this.scheduleMock(delayInSeconds, job)
  }
}

export type SocketController = {
  send(message: any): void
  replier(handler: (outboundMessage: any) => unknown | undefined): void

  notifyReconnection(): void
  notifyTermination(initiator: "client" | "server", event: any): void

  setConnected(): void
  setDisconnected(): void
}

export const createSocketController = (socket: MockSocket): SocketController => {
  let sender: SocketMessageListener | undefined
  let replier: ((outboundMessage: any) => unknown | undefined) | undefined
  let reconnecNotifier: (() => void) | undefined
  let terminationNotifier: ((initiator: "client" | "server", event: any) => void) | undefined

  socket.sendMock.mockImplementation((message: any) => {
    if (replier) {
      const reply = replier(message)
      if (reply) {
        // We use a setTimeout so it will be sent right after the promise as resolve in the return below
        setTimeout(() => {
          if (sender) {
            sender(reply)
          }
        })
      }
    }
    return Promise.resolve()
  })

  socket.connectMock.mockImplementation(
    (listener: SocketMessageListener, options: SocketConnectOptions) => {
      sender = listener
      reconnecNotifier = options.onReconnect
      terminationNotifier = options.onTermination
      return Promise.resolve()
    }
  )

  socket.disconnectMock.mockImplementation(() => {
    sender = undefined
    reconnecNotifier = undefined
    terminationNotifier = undefined
    return Promise.resolve()
  })

  return {
    replier(handler: (outboundMessage: any) => unknown | undefined) {
      replier = handler
    },

    send(message: any) {
      if (sender) {
        sender(message)
      }
    },

    notifyReconnection() {
      if (reconnecNotifier) {
        reconnecNotifier()
      }
    },

    notifyTermination(initiator: "client" | "server", event: any) {
      if (terminationNotifier) {
        terminationNotifier(initiator, event)
      }
    },

    setConnected() {
      socket.isConnectedMock.mockReturnValue(true)
    },

    setDisconnected() {
      socket.isConnectedMock.mockReturnValue(false)
    },
  }
}
