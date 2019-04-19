import {
  GetActionTracesMessageData,
  GetTableRowsMessageData,
  StreamOptions,
  GetTransactionLifecycleMessageData
} from "../message/outbound"
import { AuthTokenResponse } from "./auth-token"
import { SearchTransactionsResponse, SearchSortType } from "./search"
import { OnStreamMessage } from "./stream-client"

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
import { Stream } from "./stream"

export type RequestIdGenerator = () => string

/**
 * The `DfuseClient` interface is the back-bone of the library. Based on the Facade
 * pattern, this client is your single go to point for interacting with dfuse Stream
 * API as well as the dfuse REST API.
 *
 * The client contains only top-level methods enabling you to retrieve all the
 * information you need for your next-gen blockchain project.
 *
 * The dfuse Client takes care for you of:
 * - Management of WebSocket connection (automatic connection/disconnection when needed).
 * - Management of the API key (API token retrieval, freshness and persistence).
 * - Abstract dfuse API into simple to use top-level methods.
 * - Error handling wrapping error received via WebSocket and REST into easy to use error.
 *
 * @group Interfaces
 */
export interface DfuseClient {
  //
  /// WebSocket API
  //

  /**
   * Retrieve a stream of actions, filtered by receiver(s), account(s) and action name(s).
   *
   * @param data (required)
   * @param onMessage (required) The callback that will be invoked for each message received for this specific stream.
   * @param options (defaults `undefined`) The stream common options that can be used, see [[StreamOptions]] for more details and default values.
   *
   * @see https://docs.dfuse.io/#websocket-based-api-get_action_traces
   */
  streamActionTraces(
    data: GetActionTracesMessageData,
    onMessage: OnStreamMessage,
    options?: StreamOptions
  ): Promise<Stream>

  /**
   * Retrieve a stream of changes to the tables, the side effects of transactions/actions being executed.
   *
   * @param data (required)
   * @param onMessage (required) The callback that will be invoked for each message received for this specific stream.
   * @param options (defaults `undefined`) The stream common options that can be used, see [[StreamOptions]] for more details and default values.
   *
   * @see https://docs.dfuse.io/#websocket-based-api-get_table_rows
   */
  streamTableRows(
    data: GetTableRowsMessageData,
    onMessage: OnStreamMessage,
    options?: StreamOptions
  ): Promise<Stream>

  /**
   * Retrieve a `transaction_lifecycle` (when `fetch` is true) and follow its life-cycle (when `listen` is true).
   *
   * @param data (required)
   * @param onMessage (required) The callback that will be invoked for each message received for this specific stream.
   * @param options (defaults `undefined`) The stream common options that can be used, see [[StreamOptions]] for more details and default values.
   *
   * @see https://docs.dfuse.io/#websocket-based-api-get_transaction_lifecycle
   */
  streamTransaction(
    data: GetTransactionLifecycleMessageData,
    onMessage: OnStreamMessage,
    options?: StreamOptions
  ): Promise<Stream>

  /**
   * Retrieve a stream of informations about the chain as it moves forward
   *
   * @param onMessage (required) The callback that will be invoked for each message received for this specific stream.
   * @param options (defaults `undefined`) The stream common options that can be used, see [[StreamOptions]] for more details and default values.
   *
   * @see https://docs.dfuse.io/#websocket-based-api-get_head_info
   */
  streamHeadInfo(onMessage: OnStreamMessage, options?: StreamOptions): Promise<Stream>

  //
  /// HTTP API
  //

  /**
   * POST /v1/auth/issue
   *
   * Issues dfuse API token for the following API key.
   *
   * @param [apiKey=undefined] The `apiKey` to generate an API token for. If left undefined, the client will provide the one it is configured with, if present.
   *
   * @see https://docs.dfuse.io/#rest-api-post-https-auth-dfuse-io-v1-auth-issue
   */
  authIssue(apiKey?: string): Promise<AuthTokenResponse>

  /**
   * GET /v0/search/transactions
   *
   * Search an EOSIO blockchain for transactions based on free-form criterias, using the simple dfuse Search query language.
   *
   * @param q Search query string. See Search language (https://docs.dfuse.io/#ref-search-query-specs) specs for details.
   * @param [options={}] Optional parameters
   * @param [options.startBlock=0] Block number to start search (inclusive). Defaults to `0`, which means from beginning of the chain.
   * @param [options.sort="asc"] Defaults to ascending search (`asc`). Use `desc` to sort descending.
   * @param [options.blockCount=Number.MAX_SAFE_INTEGER] Number of blocks to search from `startBlock`. Depending on sort order, the `blockCount` will count upwards or downwards.
   * @param [options.limit=100] Cap the number of returned results to limit. Defaults to 100.
   * @param [options.cursor] If cursor is passed back (from a previous response)
   * @param [options.withReversible=false] If `withReversible` is set to true actions included in blocks that are not yet irreversible will be included.
   *
   * @see https://docs.dfuse.io/#rest-api-get-v0-search-transactions
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
   * @param account Contract account targeted by the action.
   * @param [options={}] Optional parameters
   * @param [options.blockNum=0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param [options.json=false] Decode each row from its binary form into JSON. If json: false, then hexadecimal representation of its binary data is returned instead.
   *
   * @see https://docs.dfuse.io/#rest-api-get-v0-state-abi
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
   * @param account Contract account targeted by the action.
   * @param table The name-encoded table name you want to retrieve. For example, user balances for tokens live in the accounts table. Refer to the contract's ABI for a list of available tables. This is contract dependent.
   * @param hexRows An array of hexadecimal rows to decode. Each row must be a valid hexadecimal string representation of the row to decode against the ABI.
   * @param [options={}] Optional parameters
   * @param [options.blockNum0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   *
   * @see https://docs.dfuse.io/#rest-api-post-v0-state-abi-bin_to_json
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
   * @param publicKey The public key to fetch controlled accounts for.
   * @param [options={}] Optional parameters
   * @param [options.blockNum=0] The block number for which you want to retrieve the list of accounts. Defaults to `0` which means `Last Head Block`.
   *
   * @see https://docs.dfuse.io/#rest-api-get-v0-state-key_accounts
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
   * @param account Contract account targeted by the action.
   * @param [options={}] Optional parameters
   * @param [options.blockNum=0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   *
   * @see https://docs.dfuse.io/#rest-api-get-v0-state-permission_links
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
   * @param account Contract account holding the requested table.
   * @param table The name-encoded table name you want to retrieve scopes from. Refer to the contract's ABI for a list of available tables. This is contract dependent.
   * @param [options={}] Optional parameters
   * @param [options.blockNum=0] The block number for which you want to retrieve the consistent table scopes snapshot. Defaults to `0` which means `Last Head Block`.
   *
   * @see https://docs.dfuse.io/#rest-api-get-v0-state-table_scopes
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
   * @param account Contract account targeted by the action.
   * @param scope The name-encoded scope of the table you are requesting.
   * For example, user balances for tokens live in their account name's scope.
   * This is contract dependent, so inspect the ABI for the contract you are interested in.
   * @param table The name-encoded table name you want to retrieve.
   * For example, user balances for tokens live in the accounts table.
   * Refer to the contract's ABI for a list of available tables.
   * This is contract dependent.
   * @param [options={}] Optional parameters
   * @param [options.blockNum=0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param [options.json=false] Decode each row from its binary form into JSON. If json: false, then hexadecimal representation of its binary data is returned instead.
   * @param [options.keyType="name"] How to represent the row keys in the returned table.
   * @param [options.withBlockNum=false] Will return one `blockNum` with each row. Represents the block at which that row was last changed.
   * @param [options.withAbi=false] Will return the ABI in effect at block block_num.
   *
   * @see  https://docs.dfuse.io/#rest-api-get-v0-state-table
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
   * @param accounts An AccountName list a maximum of 1500 elements can be present in the list.
   * @param scope A Name list, a maximum of 1500 elements can be present in the list.
   * @param table The name-encoded table name you want to retrieve.
   * For example, user balances for tokens live in the accounts table.
   * Refer to the contract's ABI for a list of available tables.
   * This is contract dependent.
   * @param [options={}] Optional parameters
   * @param [options.blockNum=0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param [options.json=false] Decode each row from its binary form into JSON. If json: false, then hexadecimal representation of its binary data is returned instead.
   * @param [options.keyType="name"] How to represent the row keys in the returned table.
   * @param [options.withBlockNum=false] Will return one block_num with each row. Represents the block at which that row was last changed.
   * @param [options.withAbi=false] Will return the ABI in effect at block block_num.
   *
   * @see https://docs.dfuse.io/#rest-api-get-v0-state-tables-accounts
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
   * @param account Contract account targeted by the action.
   * @param scope A Name list, a maximum of 1500 elements can be present in the list.
   * @param table The name-encoded table name you want to retrieve.
   * For example, user balances for tokens live in the accounts table.
   * Refer to the contract's ABI for a list of available tables.
   * This is contract dependent.
   * @param [options={}] Optional parameters
   * @param [options.blockNum=0] The block number for which you want to retrieve the consistent table snapshot. Defaults to `0` which means `Last Head Block`.
   * @param [options.json=false] Decode each row from its binary form into JSON. If json: false, then hexadecimal representation of its binary data is returned instead.
   * @param [options.keyType="name"] How to represent the row keys in the returned table.
   * @param [options.withBlockNum=false] Will return one block_num with each row. Represents the block at which that row was last changed.
   * @param [options.withAbi=false] Will return the ABI in effect at block block_num.
   *
   * @see https://docs.dfuse.io/#rest-api-get-v0-state-tables-scopes
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
