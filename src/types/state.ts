import { DbRow } from "./table-delta"

export type StateKeyType = "name" | "hex" | "hex_be" | "uint64"

export interface StateAbiResponse {
  block_num: number
  account: string
  abi: Abi
}

/**
 * The actual ABI JSON representation as returned by EOSIO platform.
 *
 * Extracted from `github.com/EOSIO/eosjs`.
 *
 * See https://github.com/EOSIO/eosjs/blob/develop/src/eosjs-rpc-interfaces.ts#L4
 */
export interface Abi {
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

export interface StateAbiToJsonResponse<T = unknown> {
  block_num: number
  account: string
  table: string
  rows: T[]
}

export interface StateKeyAccountsResponse {
  block_num: number
  accounts: string[]
}

export interface StatePermissionLinksResponse {
  up_to_block_id?: string
  up_to_block_num?: number
  last_irreversible_block_id: string
  last_irreversible_block_num: number
  linked_permissions: LinkedPermission[]
}

export interface LinkedPermission {
  contract: string
  action: string
  permission_name: string
}

export interface StateTableScopesResponse {
  block_num: number
  accounts: string[]
}

export interface StateResponse<T = unknown> {
  up_to_block_id?: string
  up_to_block_num?: number
  last_irreversible_block_id: string
  last_irreversible_block_num: number
  abi?: Abi
  rows: Array<DbRow<T>>
}

export interface MultiStateResponse<T = unknown> {
  up_to_block_id?: string
  up_to_block_num?: number
  last_irreversible_block_id: string
  last_irreversible_block_num: number
  abi?: Abi
  rows: Array<TableRows<T>>
}

export interface TableRows<R = unknown> {
  account: string
  scope: string
  rows: Array<DbRow<R>>
}
