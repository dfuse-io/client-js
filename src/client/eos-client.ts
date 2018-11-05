import { Client, clientFactory } from "./client"
import { socketFactory } from "../../examples/config"
import { GetActionsParams, GetTableRowsParams, OutboundEOSMessage } from "./outbound"
import { InboundMessage } from "./inbound"
import { ActionTrace } from "../types/transaction"

export class EOSClient {
  public client: Client

  constructor(client?: Client) {
    if (client) {
      this.client = client
    } else {
      this.client = clientFactory(socketFactory)
    }
  }

  private createListener(typeRef: string, reqId: string) {
    return (callback: (message: InboundMessage<ActionTrace>) => any) => {
      this.client.onMessage((type: string, message: InboundMessage<ActionTrace>) => {
        if (type === typeRef && (message.req_id === reqId || message.req_id === undefined)) {
          return callback(message)
        }
      })
    }
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

    this.client.send<OutboundEOSMessage<GetActionsParams>>({
      type: "get_actions",
      req_id: baseParams.req_id,
      start_block: baseParams.start_block,
      listen: baseParams.listen === undefined ? true : baseParams.listen,
      data: params
    })

    return {
      listen: this.createListener("action_trace", reqId)
    }
  }

  public getTableRows(
    baseParams: { req_id?: string; start_block?: number; listen?: boolean },
    params: GetTableRowsParams
  ) {
    const type = "get_table_rows"
    const reqId = baseParams.req_id ? baseParams.req_id : type

    this.client.send<OutboundEOSMessage<GetTableRowsParams>>({
      type: "get_table_rows",
      req_id: baseParams.req_id,
      start_block: baseParams.start_block,
      listen: baseParams.listen === undefined ? true : baseParams.listen,
      data: params
    })

    return {
      listen: this.createListener(type, reqId)
    }
  }
}
