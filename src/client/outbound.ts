export interface OutboundMessage {
  type: string
  listen?: boolean
  req_id?: string
}

export interface OutboundEOSMessage<T> extends OutboundMessage {
  start_block?: number
  data: T
}

export interface GetActionsParams {
  account: string
  receiver?: string
  action_name?: string
  with_dbops?: boolean
  with_dtrxops?: boolean
  with_ramops?: boolean
  with_inline_traces?: boolean
}

export interface GetTableRowsParams {
  code: string
  scope: string
  table_name: string
  lower_bound?: string
  upper_bound?: string
}
