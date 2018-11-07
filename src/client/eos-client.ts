import { Client, ClientMessageListener, ClientOptions, createClient, SocketFactory } from "./client"
import {
  getActionsMessage,
  GetActionsMessageBackendParameters,
  GetActionsMessageParameters,
  getTableRowsMessage,
  GetTableRowsMessageBackendParameters,
  GetTableRowsMessageParameters,
  getTransactionMessage,
  OutboundMessage,
  OutboundMessageType,
  StreamOptions,
  unlistenMessage
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
        if (listener.messageTypes.indexOf(type) > -1 && message.req_id === listener.requestId) {
          listener.callback(type, message)
        }
      })
    }

    return this.client.connect(onMessage)
  }

  public send<T extends OutboundMessage<{}>>(
    type: OutboundMessageType,
    messageOptions: T,
    ...messageTypes: InboundMessageType[]
  ) {
    return this.sendAndListen<T>(
      messageOptions,
      messageOptions.req_id === undefined ? type : messageOptions.req_id,
      messageOptions.listen === undefined ? true : messageOptions.listen,
      ...messageTypes
    )
  }

  public getActions(parameters: GetActionsMessageParameters, options: StreamOptions = {}) {
    options = withDefaults({ listen: true }, options)
    const messageOptions = getActionsMessage(parameters, options)

    return this.sendAndListen<OutboundMessage<GetActionsMessageBackendParameters>>(
      messageOptions,
      options.requestId!,
      options.listen!,
      InboundMessageType.ACTION_TRACE
    )
  }

  public getTableRows(parameters: GetTableRowsMessageParameters, options: StreamOptions = {}) {
    options = withDefaults({ listen: true }, options)
    const messageOptions = getTableRowsMessage(parameters, options)
    return this.sendAndListen<OutboundMessage<GetTableRowsMessageBackendParameters>>(
      messageOptions,
      options.requestId!,
      options.listen!,
      InboundMessageType.TABLE_DELTA
    )
  }

  public getTransaction(id: string, options: StreamOptions = {}) {
    options = withDefaults({ fetch: true, listen: true }, options)
    const messageOptions = getTransactionMessage(id, options)

    return this.sendAndListen<OutboundMessage<{ id: string }>>(
      messageOptions,
      options.requestId!,
      options.listen!,
      InboundMessageType.TRANSACTION_LIFECYCLE
    )
  }

  private sendAndListen<T extends OutboundMessage<{}>>(
    messageOptions: T,
    requestId: string,
    listen: boolean,
    ...messageTypes: InboundMessageType[]
  ) {
    if (listen) {
      return this.createListenerWithSend<T>(requestId!, messageOptions, ...messageTypes)
    }

    this.client.send(messageOptions)
    return null
  }

  private createListenerWithSend<T extends OutboundMessage<{}>>(
    requestId: string,
    parameters: T,
    ...messageTypes: InboundMessageType[]
  ) {
    const listen = (callback: ClientMessageListener) => {
      try {
        this.registerListener({ messageTypes, requestId, callback })
      } finally {
        this.client.send(parameters)
      }
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
  messageTypes: InboundMessageType[]
  requestId: string
  callback: ClientMessageListener
}
