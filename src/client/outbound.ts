export interface OutboundMessage<T> {
  type: OutboundMessageType
  listen?: boolean
  req_id?: string
  data: T
}

export enum OutboundMessageType {
  GET_INFO = "get_info",
  GET_ACTIONS = "get_actions"
}

export interface GetActionsData {
  account: string
  receiver?: string
  action_name?: string
  with_dbops?: boolean
  with_dtrxops?: boolean
  with_ramops?: boolean
  with_inline_traces?: boolean
}

export function getActionsMessage(data: {
  account: string
  receiver?: string
  actionName?: string
  withDbOps?: boolean
  withDtrxOps?: boolean
  withRamOps?: boolean
  withInlineTraces?: boolean
}): OutboundMessage<GetActionsData> {
  return {
    type: OutboundMessageType.GET_ACTIONS,
    listen: true,
    data: {
      account: data.account,
      receiver: data.receiver,
      action_name: data.actionName,
      with_dbops: data.withDbOps,
      with_dtrxops: data.withDtrxOps,
      with_ramops: data.withRamOps
    }
  }
}
