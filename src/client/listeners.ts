import debugFactory, { IDebugger } from "debug"
import { InboundMessage } from "../message/inbound"
import { SocketMessageListener } from "./socket"
import { OutboundMessage } from "../message/outbound"
import { EoswsClient } from "./client"

export interface ListenerObject {
  reqId: string
  callback: SocketMessageListener
  subscriptionMessage: OutboundMessage<any>
  blockNum?: number
  blockId?: string
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
      if (message.type === "progress") {
        this.saveBlockProgress(message.req_id, message.data.block_num, message.data.block_id)
      }
      listener.callback(message)
    })
  }

  public saveBlockProgress(reqId: string, blockNum?: number, blockID?: string) {
    const listener = this.registeredListeners.find((ref: ListenerObject) => {
      return reqId !== ref.reqId
    })
    if (listener && blockNum && blockID) {
      listener.blockNum = blockNum
      listener.blockId = blockID
    }
  }

  public resubscribeAll(client: EoswsClient) {
    this.registeredListeners.forEach((listener: ListenerObject) => {
      this.debug("Re-subscribing to listener with request id [%s].", listener.reqId)
      if (listener.blockNum) {
        client.socket.send({ ...listener.subscriptionMessage, start_block: listener.blockNum })
      } else {
        client.socket.send(listener.subscriptionMessage)
      }
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
