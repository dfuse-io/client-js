import { Client, clientFactory } from "./client"
import { socketFactory } from "../../examples/config"
import { GetActionsParams, GetTableRowsParams, OutboundEOSMessage } from "./outbound"
import { InboundMessage } from "./inbound"
import { ActionTrace, TransactionLifeCycle } from "../types/transaction"
import { TableRow } from "../types/table_rows"

export interface ListenerObject<T> {
  type: string
  reqId: string
  callback: (message: T) => void
}

export class EOSClient {
  public client: Client
  private listenerEnabled = false
  private registeredListeners: Array<ListenerObject<any>> = []

  constructor(client?: Client) {
    if (client) {
      this.client = client
    } else {
      this.client = clientFactory(socketFactory)
    }
  }

  private registerListener<T>(
    type: string,
    reqId: string,
    callback: (message: InboundMessage<T>) => void
  ) {
    this.createListener()

    this.registeredListeners.push({
      type,
      reqId,
      callback
    })

    return callback
  }

  private createListener() {
    if (this.listenerEnabled) {
      return
    }

    this.listenerEnabled = true

    this.client.onMessage((type: string, message: InboundMessage<any>) => {
      this.registeredListeners.map((listener: ListenerObject<any>) => {
        if (
          type === listener.type &&
          (message.req_id === listener.reqId || message.req_id === undefined)
        ) {
          listener.callback(message)
        }
      })

      if (type === "unlistened") {
        console.log(`unlistened: `, message)
      }
    })
  }

  private sendSimple<T>(
    type: string,
    baseParams: { req_id?: string; start_block?: number; listen?: boolean },
    params: T
  ) {
    const options = {
      type,
      req_id: baseParams.req_id,
      start_block: baseParams.start_block,
      listen: baseParams.listen === undefined ? true : baseParams.listen,
      data: params
    }
    this.client.send<OutboundEOSMessage<T>>(options)
  }

  public send<T>(
    type: string,
    baseParams: { req_id?: string; start_block?: number; listen?: boolean },
    params: T
  ) {
    const reqId = baseParams.req_id ? baseParams.req_id : type

    this.sendSimple<T>(type, Object.assign({}, baseParams, { req_id: reqId }), params)

    const listener = (
      listenType: string,
      callback: (message: InboundMessage<ActionTrace>) => void
    ) => {
      this.registerListener<any>(listenType, reqId, callback)
    }
    return {
      listen: listener,
      reqId
    }
  }

  public unlisten(reqId: string) {
    this.client.send({ type: "unlisten", data: { req_id: reqId } })
  }

  public connect(): Promise<{}> {
    return this.client.connect()
  }

  public getActions(
    baseParams: { req_id?: string; start_block?: number; listen?: boolean },
    params: GetActionsParams
  ) {
    const type = "get_actions"
    const reqId = baseParams.req_id ? baseParams.req_id : type

    this.sendSimple<GetActionsParams>(
      type,
      Object.assign({}, baseParams, { req_id: reqId }),
      params
    )

    const listener = (callback: (message: InboundMessage<ActionTrace>) => void) => {
      this.registerListener<ActionTrace>("action_trace", reqId, callback)
    }
    return {
      listen: listener,
      reqId
    }
  }

  public getTableRows(
    baseParams: { req_id?: string; start_block?: number; listen?: boolean },
    params: GetTableRowsParams
  ) {
    const type = "get_table_rows"
    const reqId = baseParams.req_id ? baseParams.req_id : type

    this.sendSimple<GetTableRowsParams>(
      type,
      Object.assign({}, baseParams, { req_id: reqId }),
      params
    )

    const listener = (callback: (message: InboundMessage<TableRow>) => void) => {
      this.registerListener<TableRow>("table_delta", reqId, callback)
    }

    return {
      listen: listener,
      reqId
    }
  }

  public getTransaction(
    baseParams: { req_id?: string; start_block?: number; listen?: boolean },
    params: { id: string }
  ) {
    const type = "get_transaction"
    const reqId = baseParams.req_id ? baseParams.req_id : type

    this.sendSimple<{ id: string }>(type, Object.assign({}, baseParams, { req_id: reqId }), params)

    const listener = (callback: (message: InboundMessage<TransactionLifeCycle>) => void) => {
      this.registerListener<TransactionLifeCycle>("transaction_lifecycle", reqId, callback)
    }

    return {
      listen: listener,
      reqId
    }
  }
}
