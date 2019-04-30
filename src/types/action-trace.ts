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
  dbops?: DbOp<D>[]
  ramops?: RAMOp[]
  dtrxops?: DTrxOp[]
  tableops?: TableOp[]
}

export type ActionTrace<T> = {
  receipt: ActionReceipt
  act: Action<T>
  context_free: boolean
  elapsed: number
  console: string
  trx_id: string
  block_num: number
  block_time: string
  producer_block_id?: string
  account_ram_deltas?: AccountRamDelta[]
  except?: any
  inline_traces?: ActionTrace<any>[]
}

export type Action<T> = {
  account: string
  name: string
  authorization?: Authorization[]
  data: T
  hex_data?: string
}

export type Authorization = {
  actor: string
  permission: string
}

export type ActionReceipt = {
  receiver: string
  act_digest: string
  global_sequence: Uint64
  recv_sequence: Uint64
  auth_sequence: [string, number][]
  code_sequence: number
  abi_sequence: number
}

export type AccountRamDelta = {
  account: string
  delta: Int64
}

/**
 * A `int64_t` natively in `nodeos` but can become a string when > 32 bits number
 * due to how `nodeos` serialize number to JSON.
 *
 * This is like because JavaScript largest number possible is 53 bits large which
 * make it impossible to hold a full `int64_t` type. To overcome that, `nodeos`
 * will output a string when number is too large to preserve precision.
 */
export type Int64 = number | string

/**
 * A `uint64_t` natively in `nodeos` but can become a string when > 32 bits number
 * due to how `nodeos` serialize number to JSON.
 *
 * This is like because JavaScript largest number possible is 53 bits large which
 * make it impossible to hold a full `uint64_t` type. To overcome that, `nodeos`
 * will output a string when number is too large to preserve precision.
 */
export type Uint64 = number | string
