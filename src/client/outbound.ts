export interface OutboundMessage<T> {
  type: OutboundMessageType
  req_id?: string
  listen?: boolean
  fetch?: boolean
  start_block?: number
  with_progress?: number
  data: T
}

// The key must be the same as the API type but in upper snake case
export enum OutboundMessageType {
  GET_ACTION_TRACES = "get_action_traces",
  GET_TABLE_ROWS = "get_table_rows",
  GET_TRANSACTION_LIFECYCLE = "get_transaction_lifecycle",
  UNLISTEN = "unlisten"
}

export interface StreamOptions {
  listen?: boolean
  requestId?: string
  startBlock?: number
  fetch?: boolean
  withProgress?: number
}

export function unlistenMessage(requestId: string) {
  return {
    type: OutboundMessageType.UNLISTEN,
    data: {
      req_id: requestId
    }
  }
}

export interface GetActionTracesMessageParameters {
  account: string
  receiver?: string
  actionName?: string
  withDbOps?: boolean
  withDtrxOps?: boolean
  withRamOps?: boolean
  withInlineTraces?: boolean
}

export interface GetActionTracesMessageBackendParameters {
  account: string
  receiver?: string
  action_name?: string
  with_dbops?: boolean
  with_dtrxops?: boolean
  with_ramops?: boolean
  with_inline_traces?: boolean
}

export function getActionTracesMessage(
  data: GetActionTracesMessageParameters,
  streamOptions: StreamOptions = {}
): OutboundMessage<GetActionTracesMessageBackendParameters> {
  return {
    type: OutboundMessageType.GET_ACTION_TRACES,
    listen: streamOptions.listen,
    req_id: streamOptions.requestId,
    with_progress: streamOptions.withProgress,
    fetch: streamOptions.fetch,
    data: {
      account: data.account,
      receiver: data.receiver,
      action_name: data.actionName,
      with_inline_traces: data.withInlineTraces,
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
  json: boolean
}

export interface GetTableRowsMessageBackendParameters {
  code: string
  scope: string
  table_name: string
  json: boolean
}

export function getTableRowsMessage(
  data: GetTableRowsMessageParameters,
  streamOptions: StreamOptions = {}
): OutboundMessage<GetTableRowsMessageBackendParameters> {
  return {
    type: OutboundMessageType.GET_TABLE_ROWS,
    req_id: streamOptions.requestId,
    listen: streamOptions.listen,
    fetch: streamOptions.fetch,
    with_progress: streamOptions.withProgress,
    data: {
      json: data.json,
      code: data.code,
      scope: data.scope,
      table_name: data.tableName
    }
  }
}

export function getTransactionMessage(data: { id: string }, streamOptions: StreamOptions = {}) {
  return {
    type: OutboundMessageType.GET_TRANSACTION_LIFECYCLE,
    listen: streamOptions.listen,
    fetch: streamOptions.fetch,
    req_id: streamOptions.requestId,
    with_progress: streamOptions.withProgress,
    data: {
      id: data.id
    }
  }
}
