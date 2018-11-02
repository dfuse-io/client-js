import { OutboundMessage } from "./outbound"
import { InboundMessage, InboundMessageType } from "./inbound"

export function createClient(socketFactory: () => WebSocket, options: ClientOptions = {}) {
  return clientFactory(socketFactory, options)
}

export interface Client {
  connect(): Promise<{}>
  disconnect(): Promise<{}>
  isConnected(): boolean

  send<T>(message: OutboundMessage<T>): Promise<{}>
  onMessage(handler: (type: InboundMessageType, message: InboundMessage<any>) => void): void
}

export interface ClientOptions {
  autoReconnect?: boolean
  maxReconnectionAttempts?: number

  onInvalidMessage?: (message: object) => void

  onReconnect?: () => void
  onError?: () => void
  onClose?: () => void
}

const noop = () => undefined

function clientFactory(socketFactory: () => WebSocket, options: ClientOptions): Client {
  let socket: WebSocket

  const isConnected = () => {
    return socket != null
  }

  const connect = (): Promise<{}> => {
    return createPromise((resolve, reject) => {
      let resolved = false
      let connectionAttemptCount = 0

      socket = socketFactory()
      socket.onclose = (event: CloseEvent) => {
        if (event.code !== 1e3 && event.code !== 1005) {
          reconnect(event)
        }

        const onClose = options.onClose || noop
        onClose()
      }

      socket.onerror = (event: Event) => {
        if (!resolved) {
          reject(event)
        }

        // @ts-ignore
        if (event && event.code === "ECONNREFUSED") {
          reconnect(event)
        }

        const onError = options.onError || noop
        onError()
      }

      socket.onopen = () => {
        console.log("On open called!", resolved)
        if (!resolved) {
          console.log("Resolving!", resolved)
          resolve()
        } else {
          const onReconnect = options.onReconnect || noop
          onReconnect()
        }

        connectionAttemptCount = 0
        resolved = true
      }
    })
  }

  const reconnect = (event: Event | CloseEvent) => {
    return null
  }

  const disconnect = (): Promise<{}> => {
    return new Promise((resolve) => {
      socket.close()
      resolve()
    })
  }

  const send = <T>(message: OutboundMessage<T>): Promise<{}> => {
    return createPromise((resolve) => {
      // FIXME: Reconnect! here when socket is null!

      socket.send(JSON.stringify(message))
      resolve()
    })
  }

  const onMessage = (handler: (type: InboundMessageType, message: InboundMessage<any>) => void) => {
    if (socket == null) {
      throw new Error("Cannot send, not connected.")
    }

    socket.onmessage = (event: MessageEvent) => {
      // FIXME: Handle error where message is malformed!
      const payload = JSON.parse(event.data) as { [key: string]: any }
      const type = payload.type
      // canHandleType(type)

      handler(type, payload as InboundMessage<any>)
    }
  }

  return {
    connect,
    disconnect,
    isConnected,
    send,
    onMessage
  }
}

type Resolver<T> = (value?: T | PromiseLike<T>) => void
type Rejecter = (reason?: any) => void
type Executor<T> = (resolve: Resolver<T>, reject: Rejecter) => void

function createPromise<T>(executor: Executor<T>): Promise<T> {
  return new Promise(executor)
}
