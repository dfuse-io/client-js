import { DbRow } from "./common"

export type StateKeyType = "name" | "hex" | "hex_be" | "uint64" | "symbol" | "symbol_code"

export type StateAbiResponse = {
  block_num: number
  account: string
  abi: Abi
}

/**
 * The actual ABI JSON representation as returned by EOSIO platform. Extracted
 * from [EOSIO/eosjs](https://github.com/EOSIO/eosjs) library.
 *
 * @see https://github.com/EOSIO/eosjs/blob/develop/src/eosjs-rpc-interfaces.ts#L4
 */
export type Abi = {
  version: string
  types: AbiType[]
  structs: AbiStruct[]
  actions: AbiAction[]
  tables: AbiTable[]
  ricardian_clauses: AbiRicardianClause[]
  error_messages: AbiErrorMessage[]
  abi_extensions: AbiExtension[]
  variants?: AbiVariant[]
}

export type AbiType = {
  new_type_name: string
  type: string
}

export type AbiStruct = {
  name: string
  base: string
  fields: AbiStructField[]
}

export type AbiStructField = {
  name: string
  type: string
}

export type AbiAction = {
  name: string
  type: string
  ricardian_contract: string
}

export type AbiTable = {
  name: string
  type: string
  index_type: string
  key_names?: string[]
  key_types?: string[]
}

export type AbiRicardianClause = {
  id: string
  body: string
}

export type AbiErrorMessage = {
  error_code: string
  error_msg: string
}

export type AbiExtension = {
  tag: number
  value: string
}

export type AbiVariant = {
  name: string
  types: string[]
}

export type StateAbiToJsonResponse<T = unknown> = {
  block_num: number
  account: string
  table: string
  rows: T[]
}

export type StateKeyAccountsResponse = {
  block_num: number
  account_names: string[]
}

export type StatePermissionLinksResponse = {
  up_to_block_id?: string
  up_to_block_num?: number
  last_irreversible_block_id: string
  last_irreversible_block_num: number
  linked_permissions: LinkedPermission[]
}

export type LinkedPermission = {
  contract: string
  action: string
  permission_name: string
}

export type StateTableScopesResponse = {
  block_num: number
  scopes: string[]
}

export type StateResponse<T = unknown> = {
  up_to_block_id?: string
  up_to_block_num?: number
  last_irreversible_block_id: string
  last_irreversible_block_num: number
  abi?: Abi
  rows: DbRow<T>[]
}

export type MultiStateResponse<T = unknown> = {
  up_to_block_id?: string
  up_to_block_num?: number
  last_irreversible_block_id: string
  last_irreversible_block_num: number
  abi?: Abi
  tables: TableRows<T>[]
}

export type TableRows<R = unknown> = {
  account: string
  scope: string
  rows: DbRow<R>[]
}

export type StateTableRowResponse<T = unknown> = {
  up_to_block_id?: string
  up_to_block_num?: number
  last_irreversible_block_id: string
  last_irreversible_block_num: number
  abi?: Abi
  row: DbRow<T>
}
