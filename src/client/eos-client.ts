import { SocketFactory, Client, ClientOptions, createClient, ClientMessageListener } from "./client"
import {
  GetTableRowsMessageParameters,
  unlistenMessage,
  GetActionsMessageParameters,
  getActionsMessage,
  StreamOptions,
  getTableRowsMessage,
  getTransactionMessage
} from "./outbound"
import { InboundMessage, InboundMessageType } from "./inbound"

export class EOSClient {
  private client: Client
  private registeredListeners: ListenerObject[] = []

  constructor(socketFactory: SocketFactory, options?: ClientOptions) {
    this.client = createClient(socketFactory, options)
  }

  private registerListener(listener: ListenerObject) {
    this.registeredListeners.push(listener)
  }

  public connect(): Promise<void> {
    const onMessage = (type: InboundMessageType, message: InboundMessage<any>) => {
      this.registeredListeners.forEach((listener: ListenerObject) => {
        if (
          listener.handledMessageTypes.indexOf(type) > -1 &&
          message.req_id === listener.requestId
        ) {
          listener.callback(type, message)
        }
      })
    }

    return this.client.connect(onMessage)
  }

  public getActions(parameters: GetActionsMessageParameters, options: StreamOptions = {}) {
    options = withDefaults({ listen: true }, options)
    this.client.send(getActionsMessage(parameters, options))

    return this.createListener(options.requestId!, InboundMessageType.ACTION_TRACE)
  }

  public getTableRows(parameters: GetTableRowsMessageParameters, options: StreamOptions = {}) {
    options = withDefaults({ listen: true }, options)
    this.client.send(getTableRowsMessage(parameters, options))

    return this.createListener(options.requestId!, InboundMessageType.TABLE_DELTA)
  }

  public getTransaction(id: string, options: StreamOptions = {}) {
    options = withDefaults({ fetch: true, listen: true }, options)
    this.client.send(getTransactionMessage(id, options))

    return this.createListener(options.requestId!, InboundMessageType.TRANSACTION_LIFECYCLE)
  }

  private createListener(requestId: string, ...handledMessageTypes: InboundMessageType[]) {
    const listen = (callback: ClientMessageListener) => {
      this.registerListener({ handledMessageTypes, requestId, callback })
    }

    return {
      listen,
      requestId,
      unlisten: () => this.unlisten(requestId)
    }
  }

  private unlisten(requestId: string) {
    this.client.send(unlistenMessage(requestId))
  }
}

function withDefaults(defaults: any, options: StreamOptions): StreamOptions {
  const randomRequestId = `r${Math.random()
    .toString(16)
    .substr(2)}`

  return Object.assign({}, { requestId: randomRequestId }, defaults, options)
}

interface ListenerObject {
  handledMessageTypes: InboundMessageType[]
  requestId: string
  callback: ClientMessageListener
}
