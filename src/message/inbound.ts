export type InboundMessage<T> = {
  type: InboundMessageType
  req_id?: string
  data: T
}

// **Important** The key must be the same as the API type but in upper snake case for "in" operation to work
export enum InboundMessageType {
  ACTION_TRACE = "action_trace",
  ERROR = "error",
  LISTENING = "listening",
  HEAD_INFO = "head_info",
  PING = "ping",
  PROGRESS = "progress",
  UNLISTENED = "unlistened",
  TABLE_DELTA = "table_delta",
  TABLE_SNAPSHOT = "table_snapshot",
  TRANSACTION_LIFECYCLE = "transaction_lifecycle"
}
