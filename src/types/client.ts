import {
  GetActionTracesMessageData,
  GetTableRowsMessageData,
  StreamOptions,
  GetTransactionLifecycleMessageData
} from "../message/outbound"
import { AuthTokenResponse } from "./auth-token"
import { SearchTransactionsResponse, SearchSortType } from "./search"
import { Stream, OnStreamMessage } from "./stream-client"

import {
  StateAbiResponse,
  StateAbiToJsonResponse,
  StateKeyAccountsResponse,
  StatePermissionLinksResponse,
  StateResponse,
  MultiStateResponse,
  StateKeyType,
  StateTableScopesResponse
} from "./state"

export type RequestIdGenerator = () => string

/**
 * @group Interfaces
 */
export interface DfuseClient {
  //
  /// WebSocket API
  //

  streamActionTraces(
    data: GetActionTracesMessageData,
    onMessage: OnStreamMessage,
    options?: StreamOptions
  ): Promise<Stream>

  streamTableRows(
    data: GetTableRowsMessageData,
    onMessage: OnStreamMessage,
    options?: StreamOptions
  ): Promise<Stream>

  streamTransaction(
    data: GetTransactionLifecycleMessageData,
    onMessage: OnStreamMessage,
    options?: StreamOptions
  ): Promise<Stream>

  streamHeadInfo(onMessage: OnStreamMessage, options?: StreamOptions): Promise<Stream>

  //
  /// HTTP API
  //

  /**
   * POST /v1/auth/issue
   *
   * Issues dfuse API token for the following API key.
   *
   * @param {string} [apiKey=undefined] The `apiKey` to generate an API token for. If left undefined, the client will provide the one it is configured with, if present.
   */
  authIssue(apiKey?: string): Promise<AuthTokenResponse>

  /**
   * GET /v0/search/transactions
   *
   * Search an EOSIO blockchain for transactions based on free-form criterias, using the simple dfuse Search query language.
   *
   * @param {string} q Search query string. See Search language (https://docs.dfuse.io/#ref-search-query-specs) specs for details.
   * @param {object} [options={}] Optional parameters
   * @param {number} [options.startBlock=0] Block number to start search (inclusive). Defaults to `0`, which means from beginning of the chain.
   * @param {string} [options.sort="asc"] Defaults to ascending search (`asc`). Use `desc` to sort descending.
   * @param {number} [options.blockCount=Number.MAX_SAFE_INTEGER] Number of blocks to search from `startBlock`. Depending on sort order, the `blockCount` will count upwards or downwards.
   * @param {number} [options.limit=100] Cap the number of returned results to limit. Defaults to 100.
   * @param {string} [options.cursor] If cursor is passed back (from a previous response)
   * @param {boolean} [options.withReversible=false] If `withReversible` is set to true actions included in blocks that are not yet irreversible will be included.
   */
  searchTransactions(
    q: string,
    options?: {
      startBlock?: number
      sort?: SearchSortType
      blockCount?: number
      limit?: number
      cursor?: string
      withReversible?: boolean
    }
  ): Promise<SearchTransactionsResponse>

  /**
   * GET /v0/state/abi
   *
   * Fetches the ABI for a given contract account, at any block height.
   *
   * @param {string} account Contract account targeted by the action.
   * @param {object} [options={}] Optional parameters
   * @param {number} [options.blockNum=0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param {boolean} [options.json=false] Decode each row from its binary form into JSON. If json: false, then hexadecimal representation of its binary data is returned instead.
   */
  stateAbi(
    account: string,
    options?: {
      blockNum?: number
      json?: boolean
    }
  ): Promise<StateAbiResponse>

  /**
   * GET /v0/state/abi/bin_to_json
   *
   * Fetches the ABI for a given contract account, at any block height.
   *
   * @param {string} account Contract account targeted by the action.
   * @param {string} table The name-encoded table name you want to retrieve. For example, user balances for tokens live in the accounts table. Refer to the contract's ABI for a list of available tables. This is contract dependent.
   * @param {string[]} hexRows An array of hexadecimal rows to decode. Each row must be a valid hexadecimal string representation of the row to decode against the ABI.
   * @param {object} [options={}] Optional parameters
   * @param {number} [options.blockNum0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   */
  stateAbiBinToJson<T = unknown>(
    account: string,
    table: string,
    hexRows: string[],
    options?: {
      blockNum?: number
    }
  ): Promise<StateAbiToJsonResponse<T>>

  /**
   * GET /v0/state/key_accounts
   *
   * Fetches the accounts controlled by the given public key, at any block height.
   *
   * @param {string} publicKey The public key to fetch controlled accounts for.
   * @param {object} [options={}] Optional parameters
   * @param {number} [options.blockNum=0] The block number for which you want to retrieve the list of accounts. Defaults to `0` which means `Last Head Block`.
   */
  stateKeyAccounts(
    publicKey: string,
    options?: {
      blockNum?: number
    }
  ): Promise<StateKeyAccountsResponse>

  /**
   * GET /v0/state/permission_links
   *
   * Fetches snapshots of any account's linked authorizations on the blockchain, at any block height.
   *
   * @param {string} account Contract account targeted by the action.
   * @param {object} [options={}] Optional parameters
   * @param {number} [options.blockNum=0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   */
  statePermissionLinks(
    account: string,
    options?: {
      blockNum?: number
    }
  ): Promise<StatePermissionLinksResponse>

  /**
   * GET /v0/state/table_scopes
   *
   * Fetches a list of scopes, for a given table on a contract account, at any block height.
   *
   * @param {string} account Contract account holding the requested table.
   * @param {string} table The name-encoded table name you want to retrieve scopes from. Refer to the contract's ABI for a list of available tables. This is contract dependent.
   * @param {object} [options={}] Optional parameters
   * @param {number} [options.blockNum=0] The block number for which you want to retrieve the consistent table scopes snapshot. Defaults to `0` which means `Last Head Block`.
   */
  stateTableScopes(
    account: string,
    table: string,
    options?: {
      blockNum?: number
    }
  ): Promise<StateTableScopesResponse>

  /**
   * GET /v0/state/table
   *
   * Fetches the state of any table, at any block height.
   *
   * @param {string} account Contract account targeted by the action.
   * @param {string} scope The name-encoded scope of the table you are requesting.
   * For example, user balances for tokens live in their account name's scope.
   * This is contract dependent, so inspect the ABI for the contract you are interested in.
   * @param {string} table The name-encoded table name you want to retrieve.
   * For example, user balances for tokens live in the accounts table.
   * Refer to the contract's ABI for a list of available tables.
   * This is contract dependent.
   * @param {object} [options={}] Optional parameters
   * @param {number} [options.blockNum=0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param {boolean} [options.json=false] Decode each row from its binary form into JSON. If json: false, then hexadecimal representation of its binary data is returned instead.
   * @param {string} [options.keyType="name"] How to represent the row keys in the returned table.
   * @param {boolean} [options.withBlockNum=false] Will return one `blockNum` with each row. Represents the block at which that row was last changed.
   * @param {boolean} [options.withAbi=false] Will return the ABI in effect at block block_num.
   */
  stateTable<T = unknown>(
    account: string,
    scope: string,
    table: string,
    options?: {
      blockNum?: number
      json?: boolean
      keyType?: StateKeyType
      withBlockNum?: boolean
      withAbi?: boolean
    }
  ): Promise<StateResponse<T>>

  /**
   * GET /v0/state/tables/accounts
   *
   * Fetches a table for a given contract account for a group of scopes, at any block height.
   *
   * @param {string} accounts An AccountName list a maximum of 1500 elements can be present in the list.
   * @param {string[]} scope A Name list, a maximum of 1500 elements can be present in the list.
   * @param {string} table The name-encoded table name you want to retrieve.
   * For example, user balances for tokens live in the accounts table.
   * Refer to the contract's ABI for a list of available tables.
   * This is contract dependent.
   * @param {object} [options={}] Optional parameters
   * @param {number} [options.blockNum=0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param {boolean} [options.json=false] Decode each row from its binary form into JSON. If json: false, then hexadecimal representation of its binary data is returned instead.
   * @param {string} [options.keyType="name"] How to represent the row keys in the returned table.
   * @param {boolean} [options.withBlockNum=false] Will return one block_num with each row. Represents the block at which that row was last changed.
   * @param {boolean} [options.withAbi=false] Will return the ABI in effect at block block_num.
   */
  stateTablesForAccounts<T = unknown>(
    accounts: string[],
    scope: string,
    table: string,
    options?: {
      blockNum?: number
      json?: boolean
      keyType?: StateKeyType
      withBlockNum?: boolean
      withAbi?: boolean
    }
  ): Promise<MultiStateResponse<T>>

  /**
   * GET /v0/state/tables/scopes
   *
   * Fetches a table for a given contract account for a group of scopes, at any block height.
   *
   * @param {string} account Contract account targeted by the action.
   * @param {string[]} scope A Name list, a maximum of 1500 elements can be present in the list.
   * @param {string} table The name-encoded table name you want to retrieve.
   * For example, user balances for tokens live in the accounts table.
   * Refer to the contract's ABI for a list of available tables.
   * This is contract dependent.
   * @param {object} [options={}] Optional parameters
   * @param {number} [options.blockNum=0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param {boolean} [options.json=false] Decode each row from its binary form into JSON. If json: false, then hexadecimal representation of its binary data is returned instead.
   * @param {string} [options.keyType="name"] How to represent the row keys in the returned table.
   * @param {boolean} [options.withBlockNum=false] Will return one block_num with each row. Represents the block at which that row was last changed.
   * @param {boolean} [options.withAbi=false] Will return the ABI in effect at block block_num.
   */
  stateTablesForScopes<T = unknown>(
    account: string,
    scopes: string[],
    table: string,
    options?: {
      blockNum?: number
      json?: boolean
      keyType?: StateKeyType
      withBlockNum?: boolean
      withAbi?: boolean
    }
  ): Promise<MultiStateResponse<T>>
}
