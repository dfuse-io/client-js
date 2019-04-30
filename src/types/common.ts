import { ErrorData } from "./error"
import { Transaction } from "./transaction"

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

/**
 * Represents a node in the creation tree.
 * first number represents the creation node index
 * second number represents the parent node index (-1 for root)
 * third number represents the action index
 */
export type CreationNode = [number, number, number]

export type DTrxOp = {
  op: "CREATE" | "PUSH_CREATE" | "MODIFY_CREATE" | "MODIFY_CANCEL" | "CANCEL"
  action_idx: number
  sender: string
  sender_id: string
  payer: string
  published_at: string
  delay_until: string
  expiration_at: string
  trx_id: string
  trx?: Transaction
}

export type ExtDTrxOp = {
  src_trx_id: string
  block_num: number
  block_id: string
  block_time: string
} & DTrxOp

/**
 * @deprecated Renamed to `DbOp`
 */
export type DBOp<T = unknown> = DbOp<T>

export type DbOp<T = unknown> = {
  /**
   * This is a quirk of dfuse API, it's recommended to do a lower case comparison on the `op` field.
   */
  op: "ins" | "INS" | "upd" | "UPD" | "rem" | "REM"
  action_idx: number
  account: string
  table: string
  scope: string
  key: string
  old?: DbRow<T>
  new?: DbRow<T>
}

/**
 * One of `error`, `hex` or `json` field will be present depending
 * on the actual request made.
 */
export type DbRow<T = unknown> = {
  payer: string
  blockNum?: string
  error?: ErrorData
  hex?: string
  json?: T
}

export type RamOp = {
  op: string
  action_idx: number
  payer: string
  delta: number
  usage: number
}

/**
 * @deprecated Renamed to `RamOp`
 */
export type RAMOp = RamOp

export type TableOp = {
  op: "INS" | "REM"
  action_idx: number
  payer: string
  path: string
}
