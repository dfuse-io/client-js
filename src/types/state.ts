import { DbRow } from "./common"

export type StateKeyType = "name" | "hex" | "hex_be" | "uint64"

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
  types: Array<{ new_type_name: string; type: string }>
  structs: Array<{ name: string; base: string; fields: Array<{ name: string; type: string }> }>
  actions: Array<{ name: string; type: string; ricardian_contract: string }>
  tables: Array<{
    name: string
    type: string
    index_type: string
    key_names: string[]
    key_types: string[]
  }>
  ricardian_clauses: Array<{ id: string; body: string }>
  error_messages: Array<{ error_code: string; error_msg: string }>
  abi_extensions: Array<{ tag: number; value: string }>
  variants?: Array<{ name: string; types: string[] }>
}

export type StateAbiToJsonResponse<T = unknown> = {
  block_num: number
  account: string
  table: string
  rows: T[]
}

export type StateKeyAccountsResponse = {
  block_num: number
  accounts: string[]
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
  accounts: string[]
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
  rows: TableRows<T>[]
}

export type TableRows<R = unknown> = {
  account: string
  scope: string
  rows: DbRow<R>[]
}
