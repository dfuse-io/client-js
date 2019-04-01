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
  TRANSACTION_LIFECYCLE = "transaction_lifecycle"
}

export interface ActionTraceInboundMessage<T = Record<string, any>>
  extends InboundMessage<ActionTraceData<T>> {}
export interface ErrorInboundMessage extends InboundMessage<ErrorData> {}
export interface ListeningInboundMessage extends InboundMessage<ListeningData> {}
export interface HeadInfoInboundMessage extends InboundMessage<HeadInfoData> {}
export interface PingInboundMessage extends InboundMessage<{}> {}
export interface ProgressInboundMessage extends InboundMessage<ProgressData> {}
export interface UnlistenedInboundMessage extends InboundMessage<{}> {}
export interface TableDeltaInboundMessage<T = Record<string, any>>
  extends InboundMessage<TableDeltaData<T>> {}
export interface TableSnapshotInboundMessage<T = Record<string, any>>
  extends InboundMessage<TableSnapshotData<T>> {}
export interface TransactionLifecycleInboundMessage
  extends InboundMessage<TransactionLifecycleData> {}

// export type InboundMessageType = "action_trace"
//                                | "error"
//                                | "listening"
//                                | "head_info"
//                                | "ping"
//                                | "progress"
//                                | "unlistened"
//                                | "table_delta"
//                                | "table_snapshot"
//                                | "transaction_lifecycle"
