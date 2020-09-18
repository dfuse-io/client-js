import { ProgressData } from "../types/progress"
import { ActionTraceData } from "../types/action-trace"
import { ErrorData } from "../types/error"
import { ListeningData } from "../types/listen"
import { HeadInfoData } from "../types/head-info"
import { TableDeltaData } from "../types/table-delta"
import { TableSnapshotData } from "../types/table-snapshot"
import { TransactionLifecycleData } from "../types/transaction"

export type InboundMessage<T = any> = {
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
  TRANSACTION_LIFECYCLE = "transaction_lifecycle",
}

export type ActionTraceInboundMessage<T = Record<string, any>> = InboundMessage<ActionTraceData<T>>
export type ErrorInboundMessage = InboundMessage<ErrorData>
export type ListeningInboundMessage = InboundMessage<ListeningData>
export type HeadInfoInboundMessage = InboundMessage<HeadInfoData>
export type PingInboundMessage = InboundMessage
export type ProgressInboundMessage = InboundMessage<ProgressData>
export type UnlistenedInboundMessage = InboundMessage
export type TableDeltaInboundMessage<T = Record<string, any>> = InboundMessage<TableDeltaData<T>>
export type TableSnapshotInboundMessage<T = Record<string, any>> = InboundMessage<
  TableSnapshotData<T>
>
export type TransactionLifecycleInboundMessage = InboundMessage<TransactionLifecycleData>
