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
  HttpHeaders
} from "../types/http-client"
import { DfuseClientError } from "../types/error"
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

export interface DfuseClientOptions {
  network: "mainnet" | "jungle" | "kylin" | string
  apiKey: string
  secure?: boolean
  authUrl?: string

  // Advanced options
  requestIdGenerator?: RequestIdGenerator

  httpClient?: HttpClient
  httpClientOptions?: HttpClientOptions

  streamClient?: StreamClient
  streamClientOptions?: StreamClientOptions

  apiTokenStore?: ApiTokenStore
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
 * @param options The options that can be passed to customize [[DfuseClient]] instance, refer to the [[DfuseClientOptions]] for further details.
 *
 * @kind Factories
 */
export function createDfuseClient(options: DfuseClientOptions): DfuseClient {
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
 * The `DefaultClient` roles is to perform the API key management
 * functionalities of the client. It retrieves an API token using the
 * API key and ensures it stays valid throughout the lifecycle of the
 * client, refreshing the token when necessary.
 *
 * It also responsible of keep and up-to-date list of streams and managing
 * the re-connection to those stream when the websocket disconnects.
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
      block_count: options.blockCount === undefined ? Number.MAX_SAFE_INTEGER : options.blockCount,
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

  protected async registerStream(
    message: OutboundMessage,
    onMessage: OnStreamMessage
  ): Promise<Stream> {
    return this.withApiToken((apiTokenInfo: ApiTokenInfo) => {
      this.streamClient.socket.setApiToken(apiTokenInfo.token)

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
    this.streamClient.socket.setApiToken(apiToken)
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
