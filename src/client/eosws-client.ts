import { Client, ClientMessageListener, ClientOptions, createClient, SocketFactory } from "./client"
import {
  getActionTracesMessage,
  GetActionTracesMessageBackendParameters,
  GetActionTracesMessageParameters,
  getTableRowsMessage,
  GetTableRowsMessageBackendParameters,
  GetTableRowsMessageParameters,
  getTransactionMessage,
  OutboundMessage,
  StreamOptions,
  unlistenMessage
} from "./outbound"
import { InboundMessage, InboundMessageType } from "./inbound"
import { EoswsListeners } from "./eosws-listeners"

export class EoswsClient {
  public client: Client
  public listeners: EoswsListeners

  constructor(socketFactory: SocketFactory, options?: ClientOptions) {
    this.client = createClient(socketFactory, options)
    this.listeners = new EoswsListeners()
  }

  public connect(): Promise<void> {
    const onMessage = (type: InboundMessageType, message: InboundMessage<any>) => {
      this.listeners.handleMessage(type, message)
    }

    return this.client.connect(onMessage)
  }

  public send<T extends OutboundMessage<{}>>(
    messageOptions: T,
    ...messageTypes: InboundMessageType[]
  ) {
    return this.sendAndListen<T>(
      messageOptions,
      messageOptions.req_id === undefined ? messageOptions.type : messageOptions.req_id,
      messageOptions.listen === undefined ? true : messageOptions.listen,
      ...messageTypes
    )
  }

  public getActionTraces(
    parameters: GetActionTracesMessageParameters,
    options: StreamOptions = {}
  ) {
    options = withDefaults({ listen: true }, options)
    const messageOptions = getActionTracesMessage(parameters, options)

    return this.sendAndListen<OutboundMessage<GetActionTracesMessageBackendParameters>>(
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
        this.listeners.addListener({ messageTypes, requestId, callback })
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
    this.listeners.removeListener(requestId)
    this.client.send(unlistenMessage(requestId))
  }
}

function withDefaults(defaults: any, options: StreamOptions): StreamOptions {
  const randomRequestId = `r${Math.random()
    .toString(16)
    .substr(2)}`

  return Object.assign({}, { requestId: randomRequestId }, defaults, options)
}
