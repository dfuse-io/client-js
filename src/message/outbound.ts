import { DfuseError } from "../types/error"

export interface OutboundMessage<T> {
  type: OutboundMessageType
  req_id: string
  listen?: boolean
  fetch?: boolean
  start_block?: number
  with_progress?: number
  data: T
}

// **Important** The key must be the same as the API type but in upper snake case for "in" operation to work
export enum OutboundMessageType {
  GET_ACTION_TRACES = "get_action_traces",
  GET_TABLE_ROWS = "get_table_rows",
  GET_TRANSACTION_LIFECYCLE = "get_transaction_lifecycle",
  HEAD_INFO = "head_info",
  UNLISTEN = "unlisten"
}

export interface StreamOptions {
  listen?: boolean
  req_id?: string
  start_block?: number
  fetch?: boolean
  with_progress?: number
}

export interface GetActionTracesMessageData {
  account?: string // @deprecated, will be removed in next major bump
  accounts?: string
  receiver?: string // @deprecated, will be removed in next major bump
  receivers?: string
  action_name?: string // @deprecated, will be removed in next major bump
  action_names?: string
  with_dbops?: boolean
  with_dtrxops?: boolean
  with_ramops?: boolean
  with_inline_traces?: boolean
}

export function getActionTracesMessage(
  data: GetActionTracesMessageData,
  streamOptions: StreamOptions = {}
): OutboundMessage<GetActionTracesMessageData> {
  return createOutboundMessage(
    OutboundMessageType.GET_ACTION_TRACES,
    data,
    { listen: true },
    streamOptions
  )
}

export interface GetTableRowsMessageData {
  code: string
  scope: string
  table: string
  json?: boolean
  lower_bound?: string
  upper_bound?: string
}

export function getTableRowsMessage(
  data: GetTableRowsMessageData,
  streamOptions: StreamOptions = {}
): OutboundMessage<GetTableRowsMessageData> {
  return createOutboundMessage(
    OutboundMessageType.GET_TABLE_ROWS,
    data,
    { listen: true },
    streamOptions
  )
}

export interface GetTransactionLifecycleMessageData {
  id: string
}

export function getTransactionLifecycleMessage(
  data: GetTransactionLifecycleMessageData,
  streamOptions: StreamOptions = {}
): OutboundMessage<GetTransactionLifecycleMessageData> {
  return createOutboundMessage(
    OutboundMessageType.GET_TRANSACTION_LIFECYCLE,
    data,
    { listen: true, fetch: true },
    streamOptions
  )
}

export function getHeadInfoMessage(
  streamOptions: StreamOptions = {}
): OutboundMessage<GetActionTracesMessageData> {
  return createOutboundMessage(OutboundMessageType.HEAD_INFO, {}, { listen: true }, streamOptions)
}

export interface UnlistenMessageData {
  req_id: string
}

export function unlistenMessage(data: UnlistenMessageData) {
  return {
    req_id: data.req_id,
    type: OutboundMessageType.UNLISTEN,
    data
  }
}

function createOutboundMessage<T>(
  type: OutboundMessageType,
  data: T,
  defaultStreamOptions: StreamOptions,
  streamOptions: StreamOptions
): OutboundMessage<T> {
  const req_id = getStreamOption(defaultStreamOptions.req_id, streamOptions.req_id)
  if (req_id === undefined) {
    throw new DfuseError("All outbound message should have a 'req_id' value")
  }

  return {
    type,
    ...streamOptions,
    req_id,
    listen: getStreamOption(defaultStreamOptions.listen, streamOptions.listen),
    fetch: getStreamOption(defaultStreamOptions.fetch, streamOptions.fetch),
    start_block: getStreamOption(defaultStreamOptions.start_block, streamOptions.start_block),
    with_progress: getStreamOption(defaultStreamOptions.with_progress, streamOptions.with_progress),
    data
  }
}

function getStreamOption<T>(
  defaultValue: T | undefined,
  actualValue: T | undefined
): T | undefined {
  return actualValue === undefined ? defaultValue : actualValue
}
