import { Client, clientFactory } from "./client"
import { socketFactory } from "../../examples/config"
import { GetActionsParams, GetTableRowsParams, OutboundEOSMessage } from "./outbound"
import { InboundMessage } from "./inbound"
import { ActionTrace, TransactionLifeCycle } from "../types/transaction"
import { TableRow } from "../types/table_rows"

export class EOSClient {
  public client: Client
  private listenerEnabled = false
  private registeredListeners: Array<{
    type: string
    reqId: string
    callBack: (message: any) => void
  }> = []

  constructor(client?: Client) {
    if (client) {
      this.client = client
    } else {
      this.client = clientFactory(socketFactory)
    }
  }

  private registerListener(type: string, reqId: string, callBack: (message: any) => void) {
    this.registeredListeners.push({
      type,
      reqId,
      callBack
    })
  }

  private createListener<T>(typeRef: string, reqId: string) {
    if (this.listenerEnabled) {
      return
    }

    this.listenerEnabled = true

    return (callback: (message: InboundMessage<T>) => any) => {
      this.client.onMessage((type: string, message: InboundMessage<T>) => {
        if (type === typeRef && (message.req_id === reqId || message.req_id === undefined)) {
          return callback(message)
        }

        if (type === "unlistened") {
          console.log(`unlistened (req_id: ${reqId}): `, message)
        }
      })
    }
  }

  private send<T>(
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

    this.send<GetActionsParams>(type, Object.assign({}, baseParams, { req_id: reqId }), params)

    return {
      listen: this.createListener<ActionTrace>("action_trace", reqId)
    }
  }

  public getTableRows(
    baseParams: { req_id?: string; start_block?: number; listen?: boolean },
    params: GetTableRowsParams
  ) {
    const type = "get_table_rows"
    const reqId = baseParams.req_id ? baseParams.req_id : type

    this.send<GetTableRowsParams>(type, Object.assign({}, baseParams, { req_id: reqId }), params)

    return {
      listen: this.createListener<TableRow>("table_delta", reqId),
      reqId
    }
  }

  public getTransaction(
    baseParams: { req_id?: string; start_block?: number; listen?: boolean },
    params: { id: string }
  ) {
    const type = "get_transaction"
    const reqId = baseParams.req_id ? baseParams.req_id : type

    this.send<{ id: string }>(type, Object.assign({}, baseParams, { req_id: reqId }), params)

    return {
      listen: this.createListener<TransactionLifeCycle>("transaction_lifecycle", reqId),
      reqId
    }
  }
}
