import { DfuseClientError } from "../types/error"

export type OutboundMessage<T = unknown> = {
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
  GET_HEAD_INFO = "get_head_info",
  UNLISTEN = "unlisten"
}

export type StreamOptions = {
  req_id?: string
  fetch?: boolean
  listen?: boolean
  start_block?: number
  with_progress?: number
  irreversible_only?: boolean
}

export type GetActionTracesMessageData = {
  accounts: string
  receivers?: string
  action_names?: string
  with_dbops?: boolean
  with_dtrxops?: boolean
  with_ramops?: boolean
  with_tableops?: boolean
  with_inline_traces?: boolean
}

export function getActionTracesMessage(
  data: GetActionTracesMessageData,
  streamOptions: StreamOptions = {}
): OutboundMessage<GetActionTracesMessageData> {
  return createOutboundMessage(OutboundMessageType.GET_ACTION_TRACES, data, {
    listen: true,
    ...streamOptions
  })
}

export type GetTableRowsMessageData = {
  code: string
  scope: string
  table: string
  json?: boolean
  lower_bound?: string
  upper_bound?: string
}

/**
 * @deprecated The message factories are deprecated, there is no need to create your
 *             own message anynore. This will be removed in a future release. The standard
 *             client does not use this anymore.
 */
export function getTableRowsMessage(
  data: GetTableRowsMessageData,
  streamOptions: StreamOptions = {}
): OutboundMessage<GetTableRowsMessageData> {
  return createOutboundMessage(OutboundMessageType.GET_TABLE_ROWS, data, {
    listen: true,
    ...streamOptions
  })
}

export type GetTransactionLifecycleMessageData = {
  id: string
}

/**
 * @deprecated The message factories are deprecated, there is no need to create your
 *             own message anynore. This will be removed in a future release. The standard
 *             client does not use this anymore.
 */
export function getTransactionLifecycleMessage(
  data: GetTransactionLifecycleMessageData,
  streamOptions: StreamOptions = {}
): OutboundMessage<GetTransactionLifecycleMessageData> {
  return createOutboundMessage(OutboundMessageType.GET_TRANSACTION_LIFECYCLE, data, {
    listen: true,
    fetch: true,
    ...streamOptions
  })
}

/**
 * @deprecated The message factories are deprecated, there is no need to create your
 *             own message anynore. This will be removed in a future release. The standard
 *             client does not use this anymore.
 */
export function getHeadInfoMessage(streamOptions: StreamOptions = {}): OutboundMessage<{}> {
  return createOutboundMessage(
    OutboundMessageType.GET_HEAD_INFO,
    {},
    { listen: true, ...streamOptions }
  )
}

export type UnlistenMessageData = {
  req_id: string
}

/**
 * @deprecated The message factories are deprecated, there is no need to create your
 *             own message anynore. This will be removed in a future release. The standard
 *             client does not use this anymore.
 */
export function unlistenMessage(data: UnlistenMessageData) {
  return {
    req_id: data.req_id,
    type: OutboundMessageType.UNLISTEN,
    data
  }
}

export type OutboundMessageFactory<T> = (
  createOutboundMessage: (
    type: OutboundMessageType,
    data: T,
    userOptions: StreamOptions
  ) => OutboundMessage<T>,
  withDefaultOptions: (userOptions: StreamOptions) => StreamOptions
) => OutboundMessage<T>

/**
 * Exported for consumption from internal packages. This does **not**
 * have any **Backward compatibility** policy nor documentation attached
 * to it.
 *
 * It will be moved and made private again when message factories
 * above have been removed.
 */
export function createOutboundMessage<T>(
  type: OutboundMessageType,
  data: T,
  options: StreamOptions
): OutboundMessage<T> {
  const req_id = options.req_id
  if (req_id === undefined) {
    throw new DfuseClientError("All outbound message should have a 'req_id' value")
  }

  return {
    type,
    req_id,
    data,
    ...options
  }
}
