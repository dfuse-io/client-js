import debugFactory, { IDebugger } from "debug"
import { InboundMessage, InboundMessageType } from "../message/inbound"
import { SocketMessageListener } from "./socket"

export interface ListenerObject {
  reqId: string
  callback: SocketMessageListener
}

export class EoswsListeners {
  public registeredListeners: ListenerObject[] = []

  private debug: IDebugger

  constructor(options: { id?: string } = {}) {
    this.debug = debugFactory(
      "eosws:listeners" + (options.id !== undefined ? `:${options.id}` : "")
    )
  }

  public handleMessage(message: InboundMessage<any>) {
    this.registeredListeners.forEach((listener: ListenerObject) => {
      if (message.req_id !== listener.reqId) {
        return
      }

      this.debug(
        "Found matching listener for request id [%s], forwarding message of type [%s].",
        message.req_id,
        message.type
      )
      listener.callback(message)
    })
  }

  public addListener(listener: ListenerObject) {
    this.debug("Adding a listener for requestId [%s].", listener.reqId)
    this.registeredListeners.push(listener)
  }

  public removeListener(reqId: string) {
    this.debug("Removing listener for requestId [%s] (if it exists).", reqId),
      (this.registeredListeners = this.registeredListeners.filter((listener: ListenerObject) => {
        return reqId !== listener.reqId
      }))
  }
}
