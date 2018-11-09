export interface InboundMessage<T> {
  type: InboundMessageType
  req_id?: string
  data: T
}

// **Important** The key must be the same as the API type but in upper snake case for "in" operation to work
export enum InboundMessageType {
  ACTION_TRACE = "action_trace",
  ERROR = "error",
  LISTENING = "listening",
  PING = "ping",
  UNLISTENED = "unlistened",
  TABLE_DELTA = "table_delta",
  TABLE_SNAPSHOT = "table_snapshot",
  TRANSACTION_LIFECYCLE = "transaction_lifecycle"
}
