import { InboundMessage, InboundMessageType } from "./inbound"
import { ClientMessageListener } from "./client"

export class EOSListeners {
  public registeredListeners: ListenerObject[] = []

  public handleMessage(type: InboundMessageType, message: InboundMessage<any>) {
    this.registeredListeners.forEach((listener: ListenerObject) => {
      if (listener.messageTypes.indexOf(type) > -1 && message.req_id === listener.requestId) {
        listener.callback(type, message)
      }
    })
  }

  public addListener(listener: ListenerObject) {
    this.registeredListeners.push(listener)
  }

  public removeListener(requestId: string) {
    this.registeredListeners = this.registeredListeners.filter((listener: ListenerObject) => {
      return requestId !== listener.requestId
    })
  }
}

export interface ListenerObject {
  messageTypes: InboundMessageType[]
  requestId: string
  callback: ClientMessageListener
}
