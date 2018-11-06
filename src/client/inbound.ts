export interface InboundMessage<T> {
  type: string
  req_id?: string
  data: T
}

// The key must be the same as the API type but in upper snake case
export enum InboundMessageType {
  ACTION_TRACE = "action_trace",
  ERROR = "error",
  LISTENING = "listening",
  PING = "ping",
  UNLISTENED = "unlistened",
  TABLE_DELTA = "table_delta",
  TRANSACTION_LIFECYCLE = "transaction_lifecycle"
}
