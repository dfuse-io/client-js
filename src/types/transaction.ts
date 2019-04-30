import { ActionTrace, Action } from "./action-trace"
import { ExtDTrxOp, DTrxOp, DbOp, RamOp, TableOp, CreationNode } from "./common"

export type TransactionLifecycleData = {
  lifecycle: TransactionLifecycle
}

export type TransactionStatus =
  | "pending"
  | "delayed"
  | "canceled"
  | "expired"
  | "executed"
  | "soft_fail"
  | "hard_fail"

export type TransactionLifecycle = {
  id: string
  transaction: Transaction
  transaction_status: TransactionStatus
  execution_trace?: TransactionTrace
  execution_block_header?: BlockHeader
  created_by?: ExtDTrxOp
  canceled_by?: ExtDTrxOp
  execution_irreversible: boolean
  creation_irreversible: boolean
  cancelation_irreversible: boolean
  dtrxops?: DTrxOp[]
  dbops?: DbOp[]
  ramops?: RamOp[]
  tableops?: TableOp[]
  pub_keys?: string[]
  creation_tree?: CreationNode[]
}

export type Transaction = {
  expiration: string
  ref_block_num: number
  ref_block_prefix: number
  max_net_usage_words: number
  max_cpu_usage_ms: number
  delay_sec: number
  context_free_actions: Action<any>[]
  actions: Action<any>[]
  transaction_extensions: any[]
  signatures?: string[]
  context_free_data?: Action<any>[]
}

export type TransactionTrace = {
  id: string
  block_num: number
  block_time: string
  producer_block_id?: string
  receipt?: TransactionReceipt
  elapsed: number
  net_usage: number
  scheduled: boolean
  action_traces: ActionTrace<any>[]
  failed_dtrx_trace?: TransactionTrace
  except?: any
}

export type TransactionReceipt = {
  status: TransactionStatus
  cpu_usage_us: number
  net_usage_words: number
}

export type BlockHeader = {
  timestamp: string
  producer: string
  confirmed: number
  previous: string
  transaction_mroot: string
  action_mroot: string
  schedule_version: number
  new_producers: null
  header_extensions: any[]
}
