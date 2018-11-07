export interface OutboundMessage<T> {
  type: OutboundMessageType
  req_id?: string
  listen?: boolean
  fetch?: boolean
  start_block?: number
  with_progress?: boolean
  data: T
}

// The key must be the same as the API type but in upper snake case
export enum OutboundMessageType {
  GET_ACTIONS = "get_actions",
  GET_TABLE_ROWS = "get_table_rows",
  GET_TRANSACTION = "get_transaction",
  UNLISTEN = "unlisten"
}

export interface StreamOptions {
  listen?: boolean
  requestId?: string
  startBlock?: number
  fetch?: boolean
  withProgress?: boolean
}

export function unlistenMessage(requestId: string) {
  return {
    type: OutboundMessageType.UNLISTEN,
    data: {
      req_id: requestId
    }
  }
}

export interface GetActionsMessageParameters {
  account: string
  receiver?: string
  actionName?: string
  withDbOps?: boolean
  withDtrxOps?: boolean
  withRamOps?: boolean
  withInlineTraces?: boolean
}

export interface GetActionsMessageBackendParameters {
  account: string
  receiver?: string
  action_name?: string
  with_dbops?: boolean
  with_dtrxops?: boolean
  with_ramops?: boolean
  with_inline_traces?: boolean
}

export function getActionsMessage(
  data: GetActionsMessageParameters,
  streamOptions: StreamOptions = {}
): OutboundMessage<GetActionsMessageBackendParameters> {
  return {
    type: OutboundMessageType.GET_ACTIONS,
    listen: streamOptions.listen,
    req_id: streamOptions.requestId,
    with_progress: streamOptions.withProgress,
    fetch: streamOptions.fetch,
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

export interface GetTableRowsMessageParameters {
  code: string
  scope: string
  tableName: string
  lowerBound?: string
  upperBound?: string
}

export interface GetTableRowsMessageBackendParameters {
  code: string
  scope: string
  table_name: string
  lower_bound?: string
  upper_bound?: string
}

export function getTableRowsMessage(
  data: GetTableRowsMessageParameters,
  streamOptions: StreamOptions = {}
): OutboundMessage<GetTableRowsMessageBackendParameters> {
  return {
    type: OutboundMessageType.GET_TABLE_ROWS,
    req_id: streamOptions.requestId,
    listen: true,
    fetch: streamOptions.fetch,
    with_progress: streamOptions.withProgress,
    data: {
      code: data.code,
      scope: data.scope,
      table_name: data.tableName,
      lower_bound: data.lowerBound,
      upper_bound: data.upperBound
    }
  }
}

export function getTransactionMessage(id: string, streamOptions: StreamOptions = {}) {
  return {
    type: OutboundMessageType.GET_TRANSACTION,
    listen: true,
    fetch: true,
    req_id: streamOptions.requestId,
    with_progress: streamOptions.withProgress,
    data: {
      id
    }
  }
}
