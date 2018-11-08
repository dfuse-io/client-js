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

  public getActionTraces(
    parameters: GetActionTracesMessageParameters,
    options: StreamOptions = {}
  ) {
    options = withDefaults({ listen: true }, options)
    const messageOptions = getActionTracesMessage(parameters, options)

    return this.createListenerWithSend<OutboundMessage<GetActionTracesMessageBackendParameters>>(
      options.requestId!,
      messageOptions,
      InboundMessageType.ACTION_TRACE
    )
  }

  public getTableRows(parameters: GetTableRowsMessageParameters, options: StreamOptions = {}) {
    options = withDefaults({ listen: true }, options)
    const messageOptions = getTableRowsMessage(parameters, options)
    return this.createListenerWithSend<OutboundMessage<GetTableRowsMessageBackendParameters>>(
      options.requestId!,
      messageOptions,
      InboundMessageType.TABLE_DELTA
    )
  }

  public getTransactionLifeCycle(id: string, options: StreamOptions = {}) {
    options = withDefaults({ fetch: true, listen: true }, options)
    const messageOptions = getTransactionMessage({ id }, options)

    return this.createListenerWithSend<OutboundMessage<{ id: string }>>(
      options.requestId!,
      messageOptions,
      InboundMessageType.TRANSACTION_LIFECYCLE
    )
  }

  private createListenerWithSend<T extends OutboundMessage<{}>>(
    requestId: string,
    parameters: T,
    ...messageTypes: InboundMessageType[]
  ) {
    const onMessage = (callback: ClientMessageListener) => {
      try {
        this.listeners.addListener({ messageTypes, requestId, callback })
      } finally {
        this.client.send(parameters)
      }
    }

    // TODO: listen => onMessage
    return {
      onMessage,
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
