import { EoswsSocket, SocketMessageListener } from "./socket"
import {
  getActionTracesMessage,
  GetActionTracesMessageData,
  getTableRowsMessage,
  GetTableRowsMessageData,
  getTransactionMessage,
  OutboundMessage,
  StreamOptions,
  unlistenMessage
} from "../message/outbound"
import { InboundMessage, InboundMessageType } from "../message/inbound"
import { EoswsListeners } from "./listeners"

export class EoswsClient {
  public socket: EoswsSocket
  public listeners: EoswsListeners

  constructor(socket: EoswsSocket) {
    this.socket = socket
    this.listeners = new EoswsListeners()
  }

  public connect(): Promise<void> {
    return this.socket.connect((message: InboundMessage<any>) => {
      this.listeners.handleMessage(message)
    })
  }

  public disconnect(): Promise<void> {
    return this.socket.disconnect()
  }

  public getActionTraces(data: GetActionTracesMessageData, options: StreamOptions = {}) {
    options = mergeDefaultsStreamOptions(options, {
      listen: true
    })

    return this.createListenerWithSend(getActionTracesMessage(data, options))
  }

  public getTableRows(parameters: GetTableRowsMessageData, options: StreamOptions = {}) {
    options = mergeDefaultsStreamOptions(options, {
      listen: true
    })

    return this.createListenerWithSend(getTableRowsMessage(parameters, options))
  }

  public getTransaction(id: string, options: StreamOptions = {}) {
    options = mergeDefaultsStreamOptions(options, {
      fetch: true,
      listen: true
    })

    return this.createListenerWithSend(getTransactionMessage({ id }, options))
  }

  private createListenerWithSend(message: OutboundMessage<any>) {
    const reqId = message.req_id!
    const onMessage = (callback: SocketMessageListener) => {
      this.listeners.addListener({ reqId, callback })
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
