import { RamOp, DTrxOp, TableOp, Int64, Uint64 } from "./common"

export type ActionTraceData<T = Record<string, any>> = {
  block_num: number
  block_id: string
  block_time: string
  trx_id: string
  idx: number
  depth: number
  trace: ActionTrace<T>
  dbops?: ActionTraceDbOp[]
  ramops?: RamOp[]
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
 * The `dbops` array out of an [[ActionTraceData]] message is completely
 * different than other [[DbOp]] found in dfuse API (like on [[TableDeltaData]]
 * or [[TransactionLifecycle]]).
 *
 * One for `opayer` or `npayer` will always be present depending on the
 * operation, same thing for the `old` and `new` fields:
 *
 * - When `op == "INS"`, `npayer` and `new` are present
 * - When `op == "UPD"`, `opayer`, `old`, `npayer` and `new` are present
 * - When `op == "REM"`, `opayer` and `old` are present
 *
 * The `old` and `new` fields are the hexadecimal string encoded
 * representing the row in binary format.
 *
 * Check the [Decode Hex Data using eosjs example](https://github.com/dfuse-io/example-eosjs-decode-hex)
 * for a way to transform the hexadecimal string into a JSON
 * structure representing the row.
 *
 * @see https://github.com/dfuse-io/example-eosjs-decode-hex
 */
export type ActionTraceDbOp = {
  op: "INS" | "UPD" | "REM"
  action_idx: number

  /**
   * The account which was the old payer of the row. Present when `op == "UPD" | "REM"`.
   */
  opayer?: string

  /**
   * The account which is the new payer of the row. Present when `op == "UPD" | "REM"`.
   */
  npayer?: string

  /**
   * The full path of the database row, it's a string with four elements
   * of the row path separated with the `/` character being respectively
   * from left to right: account, scope, table, row primary key (name encoded).
   *
   * ```
   * "eosio.token/trustdicewin/accounts/........ehbo5"
   *
   * {
   *   account: "eosio.token",
   *   scope: "trustdicewin",
   *   table: "accounts",
   *   key: "........ehbo5", // Name encoded value representing `EOS` SymbolCode
   * }
   * ```
   */
  path: string

  /**
   * The hexadecimal string encoded representing the old version of the
   * row in binary format. Present when `op == "UPD" | "REM"`.
   */
  old?: string

  /**
   * The hexadecimal string encoded representing the new version of the
   * row in binary format. Present when `op == "INS" | "UPD"`.
   */
  new?: string
}
