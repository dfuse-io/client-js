import debugFactory, { IDebugger } from "debug"
import {
  GetActionTracesMessageData,
  StreamOptions,
  GetTableRowsMessageData,
  GetTransactionLifecycleMessageData,
  getActionTracesMessage,
  OutboundMessage,
  getTableRowsMessage,
  getTransactionLifecycleMessage,
  getHeadInfoMessage
} from "../message/outbound"
import { InboundMessage } from "../message/inbound"
import { DfuseClient, RequestIdGenerator } from "../types/client"
import { SearchSortType, SearchTransactionsResponse } from "../types/search"
import { AuthTokenResponse, ApiTokenInfo } from "../types/auth-token"
import {
  StateAbiResponse,
  StateKeyAccountsResponse,
  StateAbiToJsonResponse,
  StateTableScopesResponse,
  StateKeyType,
  StateResponse,
  MultiStateResponse,
  StatePermissionLinksResponse
} from "../types/state"
import { ApiTokenManager, createApiTokenManager } from "./api-token-manager"
import { createHttpClient, HttpClientOptions } from "./http-client"
import {
  V1_AUTH_ISSUE,
  V0_SEARCH_TRANSACTIONS,
  HttpQueryParameters,
  V0_STATE_ABI,
  V0_STATE_ABI_BIN_TO_JSON,
  V0_STATE_KEY_ACCOUNTS,
  V0_STATE_PERMISSION_LINKS,
  V0_STATE_TABLE_SCOPES,
  V0_STATE_TABLE,
  V0_STATE_TABLES_ACCOUNTS,
  V0_STATE_TABLES_SCOPES,
  HttpClient,
  HttpHeaders,
  V0_FETCH_TRANSACTION,
  V0_FETCH_BLOCK_ID_BY_TIME
} from "../types/http-client"
import { DfuseClientError, DfuseError } from "../types/error"
import { createStreamClient, StreamClientOptions } from "./stream-client"
import { StreamClient, OnStreamMessage } from "../types/stream-client"
import {
  ApiTokenStore,
  InMemoryApiTokenStore,
  LocalStorageApiTokenStore,
  OnDiskApiTokenStore
} from "./api-token-store"
import { RefreshScheduler, createRefreshScheduler } from "./refresh-scheduler"
import { Stream } from "../types/stream"
import { TransactionLifecycle } from "../types/transaction"
import { ComparisonOperator, BlockIdByTimeResponse } from "../types/block-id"

const MAX_UINT32_INTEGER = 2147483647

/**
 * All the options that can be pass to dfuse Client factory
 * [[createDfuseClient]].
 */
export interface DfuseClientOptions {
  /**
   * The network to connect to. Can be a plain string in the set
   * `mainnet | jungle | kylin`. If it's not a string in this
   * set, the value is assumed to be an hostname pointing to the
   * the service, for example, your internal dfuse endpoint.
   *
   * When it's a known network name, the hostname that is used
   * will be the known hostname for this network name.
   *
   * The final urls are constructed using
   * the [[DfuseClientOptions.secure]] option to determine which
   * protocol to use for HTTP (`https` or `http`) and WebSocket
   * (`wss` or `ws`).
   *
   * @see https://docs.dfuse.io/#endpoints
   */
  network: "mainnet" | "jungle" | "kylin" | string

  /**
   * You dfuse API key to interact with the dfuse API service. You
   * can obtain and manage your API keys at `https://app.dfuse.io`.
   * This is the self-management portal where all information
   * about your account can be found.
   */
  apiKey: string

  /**
   * Whether to use secure protocols or unsecure ones. This will
   * control final URL constructed using this parameter value and
   * the actual hostname as defined by the [[DfuseClientOptions.network]]
   * value.
   */
  secure?: boolean

  /**
   * This is the authentication URL that will be reach to issue
   * new API token.
   *
   * @default `https://auth.dfuse.io`
   */
  authUrl?: string

  /**
   * A function that generates a random request ID. This request ID
   * is used when using the dfuse Stream API when no specific
   * ID is passed at registration time.
   *
   * @default A generator that generates random id of the form `dc-<13-hex-chars>`.
   */
  requestIdGenerator?: RequestIdGenerator

  /**
   * The [[HttpClient]] instance that [[DfuseClient]] should use to interact
   * with dfuse REST API. When `undefined` (the default), an instance is
   * created using [[createHttpClient]] factory method and used. If
   * [[DfuseClientOptions.httpClientOptions]] is set, it used when creating
   * the default instanve.
   *
   * @default A default [[HttpClient]] instance (via [[createHttpClient]]) using [[DfuseClientOptions.httpClientOptions]].
   */
  httpClient?: HttpClient

  /**
   * The [[HttpClientOptions]] that should be used when creating the default
   * instance of [[HttpClient]].
   *
   * This parameter has no effect at all if the [[DfuseClientOptions.httpClient]] is
   * provided.
   *
   * @default `{}` See [[HttpClientOptions]] for default values
   */
  httpClientOptions?: HttpClientOptions

  /**
   * The [[StreamClient]] instance that [[DfuseClient]] should use to interact
   * with dfuse Stream API. When `undefined` (the default), an instance is
   * created using [[createStreamClient]] factory method and used. If
   * [[DfuseClientOptions.streamClientOptions]] is set, it used when creating
   * the default instanve.
   *
   * @default A default [[StreamClient]] instance (via [[createStreamClient]]) using [[DfuseClientOptions.httpClientOptions]].
   */
  streamClient?: StreamClient

  /**
   * The [[StreamClientOptions]] that should be used when creating the default
   * instance of [[StreamClient]].
   *
   * This parameter has no effect at all if the [[DfuseClientOptions.streamClient]] is
   * provided.
   *
   * @default `{}` See [[StreamClientOptions]] for default values
   */
  streamClientOptions?: StreamClientOptions

  /**
   * The API token store instance that should be use by the [[DfuseClient]]
   * to retrieve and store the API token from. It's via this interface the
   * API token is persisted and also retrieved from persistence storage
   * when required.
   *
   * When `undefined` (the default), a [[LocalStorageApiTokenStore]] is
   * used when a Browser environment is detected, a [[OnDiskApiTokenStore]] is
   * used when a Node.js environment is detected and the [[InMemoryApiTokenStore]]
   * is used as a fallback if niether detection worked.
   *
   * @default Inferred based on the environment (Browser [[LocalStorageApiTokenStore]], Node.js [[OnDiskApiTokenStore]], [[InMemoryApiTokenStore]] otherwise).
   */
  apiTokenStore?: ApiTokenStore

  /**
   * The refresh scheduler instance that should be used to schedule a token
   * refresh. This is more an internal details of the [[DfuseClient]] should
   * most likely `undefined` for most user to pick a default refresh scheduler.
   *
   * @default A default [[RefreshScheduler]] instance (via [[createRefreshScheduler]])
   */
  refreshScheduler?: RefreshScheduler
}

/**
 * The main entry point of the library, use it to create the standard [[DfuseClient]]
 * instance.
 *
 * Only the `apiKey` and `network` parameters are mandatory, all others have sane
 * default values based on your execution environment (be it a Browser or Node.js).
 *
 * This will create the default
 *
 * @param options The options that can be passed to customize [[DfuseClient]] instance,
 * refer to the [[DfuseClientOptions]] for further details.
 *
 * @kind Factories
 */
export function createDfuseClient(options: DfuseClientOptions): DfuseClient {
  checkApiKey(options.apiKey)

  const endpoint = networkToEndpoint(options.network)
  const secureEndpoint = options.secure === undefined ? true : options.secure

  const authUrl = options.authUrl || "https://auth.dfuse.io"
  const httpUrl = secureEndpoint ? `https://${endpoint}` : `http://${endpoint}`
  const wsUrl = secureEndpoint ? `wss://${endpoint}` : `ws://${endpoint}`

  const httpClient =
    options.httpClient || createHttpClient(authUrl, httpUrl, options.httpClientOptions)
  const streamClient =
    options.streamClient || createStreamClient(wsUrl + "/v1/stream", options.streamClientOptions)

  const apiTokenStore = options.apiTokenStore || inferApiTokenStore(options.apiKey)
  const refreshScheduler = options.refreshScheduler || createRefreshScheduler()

  const requestIdGenerator = options.requestIdGenerator || randomReqId

  return new DefaultClient(
    options.apiKey,
    httpClient,
    streamClient,
    apiTokenStore,
    refreshScheduler,
    requestIdGenerator
  )
}

function checkApiKey(apiKey: string) {
  if (!apiKey.match(/^(mobile|server|web)_[0-9a-f]{2,}/i)) {
    const messages = [
      "The provided API key is not in the right format expecting it",
      "to be start with either `mobile_`, `server_` or `web_` followed",
      "by a series of hexadecimal character, like `web_0123456789abcdef`",
      ""
    ]

    // Assume it's an API token if looks (roughly) like a JWT token
    if (apiKey.split(".").length === 3) {
      messages.push(
        "It seems your providing directly a API token (JWT) instead",
        "of an API key and are using your previous authentication protocol.",
        "Please refer to http://docs.dfuse.io/#authentication for",
        "all the details about API key and how to generate an API token",
        "from it.",
        "",
        "And you can visit https://app.dfuse.io to obtain your free API key",
        ""
      )
    }

    messages.push(`Input received: ${apiKey}`)

    throw new DfuseError(messages.join("\n"))
  }
}

function inferApiTokenStore(apiKey: string) {
  const debug = debugFactory("dfuse:client")

  debug("Inferring API token store default concrete implementation to use")
  if (typeof window !== "undefined" && window.localStorage != null) {
    debug(
      'Using `LocalStorageApiTokenStore` as we assumed a Browser environment (`typeof window.localStorage !== "undefined"`).'
    )
    return new LocalStorageApiTokenStore("dfuse:token")
  }

  // Just in the sake that `window.localStorage` is not supported for whatever, fall
  // back to Node.js default only if we are really in a Node.js like environment.
  if (typeof window === "undefined") {
    debug(
      'Using `OnDiskLocalStorageApiTokenStore` as we assumed a Node.js enviroment (`typeof window === "undefined"`).'
    )
    return new OnDiskApiTokenStore(apiKey)
  }

  debug("Falling back default `InMemoryApiTokenStore` concrete implementation")
  return new InMemoryApiTokenStore()
}

export function networkToEndpoint(network: string): string {
  if (network === "mainnet" || network === "jungle" || network === "kylin") {
    return `${network}.eos.dfuse.io`
  }

  // Network is assumed to be an hostname to reach the dfuse service
  return network
}

/**
 * The standard implementation of a [[DfuseClient]].
 *
 * The [[DefaultClient]] role is to perform the API key management
 * functionalities of the client. It retrieves an API token using the
 * API key and ensures it stays valid throughout the lifecycle of the
 * client, refreshing the token when necessary.
 *
 * It also responsible of keep and up-to-date list of streams and managing
 * the re-connection to those stream when the websocket disconnects.
 *
 * It is supported to override the client to provide some other
 * methods on it (other EOS endpoints).
 */
export class DefaultClient implements DfuseClient {
  protected apiKey: string
  protected apiTokenManager: ApiTokenManager
  protected httpClient: HttpClient
  protected streamClient: StreamClient
  protected requestIdGenerator: RequestIdGenerator

  protected debug: IDebugger = debugFactory("dfuse:client")

  constructor(
    apiKey: string,
    httpClient: HttpClient,
    streamClient: StreamClient,
    apiTokenStore: ApiTokenStore,
    refreshScheduler: RefreshScheduler,
    requestIdGenerator: RequestIdGenerator
  ) {
    this.apiKey = apiKey
    this.httpClient = httpClient
    this.streamClient = streamClient
    this.requestIdGenerator = requestIdGenerator

    this.apiTokenManager = createApiTokenManager(
      () => this.authIssue(this.apiKey),
      this.onTokenRefresh,
      0.95,
      apiTokenStore,
      refreshScheduler
    )
  }

  //
  /// WebSocket API
  //

  public streamActionTraces(
    data: GetActionTracesMessageData,
    onMessage: (message: InboundMessage) => void,
    options: StreamOptions = {}
  ): Promise<Stream> {
    const message = getActionTracesMessage(
      data,
      mergeDefaultsStreamOptions(this.requestIdGenerator, options, {
        listen: true
      })
    )

    return this.registerStream(message, onMessage)
  }

  public async streamTableRows(
    data: GetTableRowsMessageData,
    onMessage: (message: InboundMessage) => void,
    options: StreamOptions = {}
  ): Promise<Stream> {
    const message = getTableRowsMessage(
      { json: true, ...data },
      mergeDefaultsStreamOptions(this.requestIdGenerator, options, {
        listen: true
      })
    )

    return this.registerStream(message, onMessage)
  }

  public async streamTransaction(
    data: GetTransactionLifecycleMessageData,
    onMessage: (message: InboundMessage) => void,
    options: StreamOptions = {}
  ): Promise<Stream> {
    const message = getTransactionLifecycleMessage(
      data,
      mergeDefaultsStreamOptions(this.requestIdGenerator, options, {
        fetch: true,
        listen: true
      })
    )

    return this.registerStream(message, onMessage)
  }

  public streamHeadInfo(
    onMessage: (message: InboundMessage) => void,
    options: StreamOptions = {}
  ): Promise<Stream> {
    const message = getHeadInfoMessage(
      mergeDefaultsStreamOptions(this.requestIdGenerator, options, {
        listen: true
      })
    )

    return this.registerStream(message, onMessage)
  }

  //
  /// HTTP API
  //

  public async authIssue(apiKey: string): Promise<AuthTokenResponse> {
    return this.httpClient.authRequest<AuthTokenResponse>(V1_AUTH_ISSUE, "POST", undefined, {
      api_key: apiKey
    })
  }

  public async fetchBlockIdByTime(
    time: string | Date,
    comparator: ComparisonOperator
  ): Promise<BlockIdByTimeResponse> {
    let timeString = time
    if (time instanceof Date) {
      timeString = time.toISOString()
    }

    return this.apiRequest<BlockIdByTimeResponse>(V0_FETCH_BLOCK_ID_BY_TIME, "GET", {
      time: timeString,
      comparator
    })
  }

  public fetchTransaction(id: string): Promise<TransactionLifecycle> {
    // TODO: Should we properly URL encode the transaction id?
    return this.apiRequest<TransactionLifecycle>(V0_FETCH_TRANSACTION.replace(":id", id), "GET")
  }

  public async searchTransactions(
    q: string,
    options: {
      startBlock?: number
      sort?: SearchSortType
      blockCount?: number
      limit?: number
      cursor?: string
      withReversible?: boolean
    } = {}
  ): Promise<SearchTransactionsResponse> {
    return this.apiRequest<SearchTransactionsResponse>(V0_SEARCH_TRANSACTIONS, "GET", {
      q,
      start_block: options.startBlock,
      sort: options.sort,
      block_count: options.blockCount === undefined ? MAX_UINT32_INTEGER : options.blockCount,
      limit: options.limit,
      cursor: options.cursor,
      with_reversible: options.withReversible
    })
  }

  public async stateAbi(
    account: string,
    options: { blockNum?: number; json?: boolean } = {}
  ): Promise<StateAbiResponse> {
    return this.apiRequest<StateAbiResponse>(V0_STATE_ABI, "GET", {
      account,
      block_num: options.blockNum,
      json: options.json === undefined ? true : options.json
    })
  }

  public async stateAbiBinToJson<T = unknown>(
    account: string,
    table: string,
    hexRows: string[],
    options: { blockNum?: number } = {}
  ): Promise<StateAbiToJsonResponse<T>> {
    return this.apiRequest<StateAbiToJsonResponse<T>>(V0_STATE_ABI_BIN_TO_JSON, "POST", undefined, {
      account,
      table,
      hex_rows: hexRows,
      block_num: options.blockNum
    })
  }

  public async stateKeyAccounts(
    publicKey: string,
    options: { blockNum?: number } = {}
  ): Promise<StateKeyAccountsResponse> {
    return this.apiRequest<StateKeyAccountsResponse>(V0_STATE_KEY_ACCOUNTS, "GET", {
      public_key: publicKey,
      block_num: options.blockNum
    })
  }

  public async statePermissionLinks(
    account: string,
    options: { blockNum?: number } = {}
  ): Promise<StatePermissionLinksResponse> {
    return this.apiRequest<StatePermissionLinksResponse>(V0_STATE_PERMISSION_LINKS, "GET", {
      account,
      block_num: options.blockNum
    })
  }

  public async stateTableScopes(
    account: string,
    table: string,
    options: { blockNum?: number } = {}
  ): Promise<StateTableScopesResponse> {
    return this.apiRequest<StateTableScopesResponse>(V0_STATE_TABLE_SCOPES, "GET", {
      account,
      table,
      block_num: options.blockNum
    })
  }

  public async stateTable<T = unknown>(
    account: string,
    scope: string,
    table: string,
    options: {
      blockNum?: number
      json?: boolean
      keyType?: StateKeyType
      withBlockNum?: boolean
      withAbi?: boolean
    } = {}
  ): Promise<StateResponse<T>> {
    return this.apiRequest<StateResponse<T>>(V0_STATE_TABLE, "GET", {
      account,
      scope,
      table,
      block_num: options.blockNum,
      json: options.json === undefined ? true : options.json,
      key_type: options.keyType,
      with_block_num: options.withBlockNum,
      with_abi: options.withAbi
    })
  }

  public async stateTablesForAccounts<T = unknown>(
    accounts: string[],
    scope: string,
    table: string,
    options: {
      blockNum?: number
      json?: boolean
      keyType?: StateKeyType
      withBlockNum?: boolean
      withAbi?: boolean
    } = {}
  ): Promise<MultiStateResponse<T>> {
    return this.apiRequest<MultiStateResponse<T>>(V0_STATE_TABLES_ACCOUNTS, "GET", {
      accounts: accounts.join("|"),
      scope,
      table,
      block_num: options.blockNum,
      json: options.json === undefined ? true : options.json,
      key_type: options.keyType,
      with_block_num: options.withBlockNum,
      with_abi: options.withAbi
    })
  }

  public async stateTablesForScopes<T = unknown>(
    account: string,
    scopes: string[],
    table: string,
    options: {
      blockNum?: number
      json?: boolean
      keyType?: StateKeyType
      withBlockNum?: boolean
      withAbi?: boolean
    } = {}
  ): Promise<MultiStateResponse<T>> {
    return this.apiRequest<MultiStateResponse<T>>(V0_STATE_TABLES_SCOPES, "GET", {
      account,
      scopes: scopes.join("|"),
      table,
      block_num: options.blockNum,
      json: options.json === undefined ? true : options.json,
      key_type: options.keyType,
      with_block_num: options.withBlockNum,
      with_abi: options.withAbi
    })
  }

  public async apiRequest<T>(
    path: string,
    method: string,
    params?: HttpQueryParameters,
    body?: any,
    headers?: HttpHeaders
  ): Promise<T> {
    return this.withApiToken((apiTokenInfo: ApiTokenInfo) => {
      return this.httpClient.apiRequest<T>(apiTokenInfo.token, path, method, params, body, headers)
    })
  }

  public async getTokenInfo(): Promise<ApiTokenInfo> {
    return this.apiTokenManager.getTokenInfo()
  }

  protected async registerStream(
    message: OutboundMessage,
    onMessage: OnStreamMessage
  ): Promise<Stream> {
    return this.withApiToken((apiTokenInfo: ApiTokenInfo) => {
      this.streamClient.setApiToken(apiTokenInfo.token)

      return this.streamClient.registerStream(message, onMessage)
    })
  }

  private async withApiToken<R>(worker: (apiTokenInfo: ApiTokenInfo) => Promise<R>): Promise<R> {
    let apiTokenInfo: ApiTokenInfo
    try {
      this.debug("Retrieving latest API token via token manager")
      apiTokenInfo = await this.apiTokenManager.getTokenInfo()
    } catch (error) {
      throw new DfuseClientError("Unable to obtain the API token", error)
    }

    return await worker(apiTokenInfo)
  }

  private onTokenRefresh = (apiToken: string) => {
    // Ensure we update the API token to have it at its latest value
    this.streamClient.setApiToken(apiToken)
  }
}

function randomReqId() {
  return `dc-${Math.random()
    .toString(16)
    .substr(2)}`
}

function mergeDefaultsStreamOptions(
  requestIdGenerator: RequestIdGenerator,
  userDefinedOptions: StreamOptions,
  defaultOptions: StreamOptions
): StreamOptions {
  return Object.assign({ req_id: requestIdGenerator() }, defaultOptions, userDefinedOptions)
}
