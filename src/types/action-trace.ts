import { DbOp } from "./table-delta"
import { RAMOp, DTrxOp, TableOp } from "./transaction"

export type ActionTraceData<T = Record<string, any>, D = Record<string, any>> = {
  block_num: number
  block_id: string
  block_time: string
  trx_id: string
  idx: number
  depth: number
  trace: ActionTrace<T>
  dbOps?: Array<DbOp<D>>
  ramOps?: RAMOp[]
  dtrxOps?: DTrxOp[]
  tableOps?: TableOp[]
}

export type ActionTrace<T> = {
  receipt: ActionReceipt
  act: Action<T>
  elapsed: number
  cpu_usage: number
  console: string
  total_cpu_usage: number
  trx_id: string
  inline_traces: Array<ActionTrace<any>>
}

export type Action<T> = {
  account: string
  name: string
  authorization: Authorization[]
  data: T
  hex_data: string
}

export type Authorization = {
  actor: string
  permission: string
}

export type ActionReceipt = {
  receiver: string
  act_digest: string
  global_sequence: number
  recv_sequence: number
  auth_sequence: Array<Array<number | string>>
  code_sequence: number
  abi_sequence: number
}
