import debugFactory, { IDebugger } from "debug"
import {
  GetActionTracesMessageData,
  StreamOptions,
  GetTableRowsMessageData,
  GetTransactionLifecycleMessageData,
  OutboundMessage,
  OutboundMessageFactory,
  createOutboundMessage,
  OutboundMessageType
} from "../message/outbound"
import { DfuseClient, RequestIdGenerator, DfuseClientEndpoints } from "../types/client"
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
  StatePermissionLinksResponse,
  StateTableRowResponse
} from "../types/state"
import {
  ApiTokenManager,
  createApiTokenManager,
  createNoopApiTokenManager
} from "./api-token-manager"
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
  V0_FETCH_BLOCK_ID_BY_TIME,
  V0_STATE_TABLE_ROW
} from "../types/http-client"
import { DfuseClientError, DfuseError } from "../types/error"
import { createStreamClient, StreamClientOptions } from "./stream-client"
import { createGraphqlStreamClient, GraphqlStreamClientOptions } from "./graphql-stream-client"

import { StreamClient, OnStreamMessage } from "../types/stream-client"
import {
  ApiTokenStore,
  InMemoryApiTokenStore,
  LocalStorageApiTokenStore,
  NoOpApiTokenStore,
  OnDiskApiTokenStore
} from "./api-token-store"
import { RefreshScheduler, createRefreshScheduler } from "./refresh-scheduler"
import { Stream } from "../types/stream"
import { TransactionLifecycle } from "../types/transaction"
import { ComparisonOperator, BlockIdByTimeResponse } from "../types/block-id"
import { GraphqlStreamClient, OnGraphqlStreamMessage } from "../types/graphql-stream-client"
import {
  GraphqlVariables,
  GraphqlOperationType,
  GraphqlDocument,
  GraphqlResponse
} from "../types/graphql"

const MAX_UINT32_INTEGER = 2147483647

/**
 * All the options that can be pass to dfuse Client factory
 * [[createDfuseClient]].
 */
export interface DfuseClientOptions {
  /**
   * The network to connect to. Can be a plain string in the set
   * `mainnet | jungle | kylin | worbli`. If it's not a string in this
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
  network: "mainnet" | "kylin" | string

  /**
   * You dfuse API key to interact with the dfuse API service. You
   * can obtain and manage your API keys at `https://app.dfuse.io`.
   * This is the self-management portal where all information
   * about your account can be found.
   *
   * If you are connecting to a `dfuse for EOSIO` instance
   * (or a local instance of our other supported chains) or if you are
   * connection to a dfuse Community Edition, you can leave this value
   * blank but you need to also set `authentication: false` otherwise
   * the client factory function will complain that `apiKey` is required.
   */
  apiKey?: string

  /**
   * Whether to use secure protocols or unsecure ones. This will
   * control final URL constructed using this parameter value and
   * the actual hostname as defined by the [[DfuseClientOptions.network]]
   * value.
   *
   * @default true
   */
  secure?: boolean

  /**
   * Whether authentication mechanism should be used for this client
   * instance. If you are connecting to a `dfuse for EOSIO` instance
   * (or a local instance of our other supported chains) or if you are
   * connection to a dfuse Community Edition, set this value to `false`
   * so authentication will be disabled altogether.
   *
   * @default true
   */
  authentication?: boolean

  /**
   * This is the authentication URL that will be reach to issue
   * new API token if `authentication` is set to `true`.
   *
   * @default 'https://auth.dfuse.io' if `authentication: true`, 'null://' otherwise
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
   * @default A default [[StreamClient]] instance (via [[createStreamClient]]) using [[DfuseClientOptions.streamClientOptions]].
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
   * The [[GraphqlStreamClient]] instance that [[DfuseClient]] should use to interact
   * with dfuse GraphQL Subscription API. When `undefined` (the default), an instance is
   * created using [[createGraphqlStreamClient]] factory method and used. If
   * [[DfuseClientOptions.graphqlStreamClientOptions]] is set, it used when creating
   * the default instanve.
   *
   * @default A default [[GraphqlStreamClient]] instance (via [[createGraphqlStreamClient]]) using [[DfuseClientOptions.graphqlStreamClientOptions]].
   */
  graphqlStreamClient?: GraphqlStreamClient

  /**
   * The [[GraphqlStreamClientOptions]] that should be used when creating the default
   * instance of [[GraphqlStreamClient]].
   *
   * This parameter has no effect at all if the [[DfuseClientOptions.graphqlStreamClient]] is
   * provided.
   *
   * @default `{}` See [[GraphqlStreamClientOptions]] for default values
   */
  graphqlStreamClientOptions?: GraphqlStreamClientOptions

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

// Small module wide variable incremented each time a client instance is created
let clientInstanceId = 0

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
  checkApiKey(options.apiKey, options.authentication)

  const endpoint = networkToEndpoint(options.network)
  const secureEndpoint = options.secure === undefined ? true : options.secure
  const authentication = options.authentication === undefined ? true : options.authentication

  const authUrl = options.authUrl || (authentication ? "https://auth.dfuse.io" : "null://")
  const restUrl = secureEndpoint ? `https://${endpoint}` : `http://${endpoint}`
  const websocketUrl = secureEndpoint ? `wss://${endpoint}` : `ws://${endpoint}`

  const endpoints: DfuseClientEndpoints = {
    authUrl,
    graphqlQueryUrl: `${restUrl}/graphql`,
    graphqlStreamUrl: `${websocketUrl}/graphql`,
    restUrl,
    websocketUrl
  }

  const httpClient =
    options.httpClient || createHttpClient(authUrl, restUrl, options.httpClientOptions)
  const streamClient =
    options.streamClient ||
    createStreamClient(websocketUrl + "/v1/stream", options.streamClientOptions)

  const graphqlStreamClient =
    options.graphqlStreamClient ||
    createGraphqlStreamClient(endpoints.graphqlStreamUrl, options.graphqlStreamClientOptions)

  const apiTokenStore = options.apiTokenStore || inferApiTokenStore(options.apiKey)
  const refreshScheduler = options.refreshScheduler || createRefreshScheduler()

  const requestIdGenerator = options.requestIdGenerator || randomReqId

  return new DefaultClient(
    clientInstanceId++,
    options.apiKey,
    endpoints,
    httpClient,
    streamClient,
    graphqlStreamClient,
    apiTokenStore,
    refreshScheduler,
    requestIdGenerator
  )
}

// Even though higher the type say it cannot be empty, this is usually provided
// by the user and as such, as assume it could be undefined.
function checkApiKey(apiKey: string | undefined, authentication: boolean | undefined) {
  if (authentication !== undefined && authentication === false) {
    return
  }

  if (apiKey == null) {
    const messages = [
      "The client must be configured with an API key via the ",
      "`apiKey` config options.",
      "",
      "Received nothing."
    ]

    throw new DfuseError(messages.join("\n"))
  }

  if (!apiKey.match(/^(mobile|server|web)_[0-9a-f]{2,}/i)) {
    const messages = [
      "The provided API key is not in the right format, expecting it",
      "to start with either `mobile_`, `server_` or `web_` followed",
      "by a series of hexadecimal character (i.e.) `web_0123456789abcdef`)",
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

function inferApiTokenStore(apiKey: string | undefined) {
  const debug = debugFactory("dfuse:client")
  if (!apiKey) {
    debug("No authentication is necessary, using `NoOpApiTokenStore` concrete implementation")
    return new NoOpApiTokenStore()
  }

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
  if (
    network === "jungle" ||
    network === "jungle.eos.dfuse.io" ||
    network === "worbli" ||
    network === "worbli.eos.dfuse.io"
  ) {
    throw new DfuseError(
      `The dfuse service has been shut down for network ${network}, please specify a different endpoint`
    )
  }

  const shortNames = ["mainnet", "kylin"]
  if (shortNames.includes(network)) {
    const mappings = shortNames
      .map((name) => `'network: "${name}"' to 'network: "${name}.eos.dfuse.io"'`)
      .join(", ")
    console.warn(
      `Deprecation notice: using a shortcut endpoint as value of client 'network' option is not supported anymore, please convert your code to use fully a qualified endpoint (${mappings})`
    )

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
  public readonly endpoints: DfuseClientEndpoints

  protected id: number
  protected apiKey: string | undefined
  protected apiTokenManager: ApiTokenManager
  protected httpClient: HttpClient
  protected streamClient: StreamClient
  protected graphqlStreamClient: GraphqlStreamClient
  protected requestIdGenerator: RequestIdGenerator

  protected debug: IDebugger = debugFactory("dfuse:client")

  constructor(
    id: number,
    apiKey: string | undefined,
    endpoints: DfuseClientEndpoints,
    httpClient: HttpClient,
    streamClient: StreamClient,
    graphqlStreamClient: GraphqlStreamClient,
    apiTokenStore: ApiTokenStore,
    refreshScheduler: RefreshScheduler,
    requestIdGenerator: RequestIdGenerator
  ) {
    this.id = id
    this.apiKey = apiKey
    this.endpoints = endpoints
    this.httpClient = httpClient
    this.streamClient = streamClient
    this.graphqlStreamClient = graphqlStreamClient
    this.requestIdGenerator = requestIdGenerator

    if (this.endpoints.authUrl.startsWith("null://")) {
      this.apiTokenManager = createNoopApiTokenManager("a.b.c")
    } else {
      this.apiTokenManager = createApiTokenManager(
        () => this.authIssue(this.apiKey!),
        this.onTokenRefresh,
        0.95,
        apiTokenStore,
        refreshScheduler
      )
    }
  }

  public release(): void {
    this.debug("Releasing default dfuse client")
    this.httpClient.release()
    this.streamClient.release()
    this.graphqlStreamClient.release()
    this.apiTokenManager.release()
  }

  //
  /// GraphQL API
  //

  // The return type has `Promise<GraphqlResponse<T> | Stream | any>`. The `any` sadly is an
  // artefact to please the compiler. Without it, the compiler thinks the resulting type is
  // not a proper implementation of `DfuseClient.graphql` which has two signatures, both of them
  // being of a different return type.
  public async graphql<T = any>(
    document: string | GraphqlDocument,
    onMessage?:
      | OnGraphqlStreamMessage<T>
      | {
          variables?: GraphqlVariables
          operationType?: Exclude<GraphqlOperationType, "subscription">
        },
    options: {
      operationType?: GraphqlOperationType
      variables?: GraphqlVariables
    } = {}
  ): Promise<GraphqlResponse<T> | Stream | any> {
    if (typeof onMessage !== "function" && onMessage) {
      options = onMessage
    }

    if (options.operationType && !isValidDocumentType(options.operationType)) {
      throw new DfuseError(
        `The 'options.operationType' value '${
          options.operationType
        }' is invalid, it must be either 'query', 'mutation' or 'subscription').`
      )
    }

    // If an `onMessage` options is provided, always use the WebSocket connection
    const onMessageProvided = typeof onMessage === "function" && onMessage
    if (onMessageProvided) {
      return this.withApiToken((apiTokenInfo: ApiTokenInfo) => {
        this.graphqlStreamClient.setApiToken(apiTokenInfo.token)

        return this.graphqlStreamClient.registerStream(
          `${this.requestIdGenerator()}-${this.id}`,
          // FIXME: Turn the document if a GraphQL document into a proper document string
          document,
          options.variables,
          onMessage as OnGraphqlStreamMessage<T>
        )
      })
    }

    const operationType = this.inferOperationType(document, options.operationType)
    if (!operationType && !onMessageProvided) {
      const messages = [
        "We were not able to infer the GraphQL operation type you are trying to perform from",
        "the document and options you provided. Without the document's operation type, we are",
        "unable to determine the transport layer to use to execute your operation, either HTTP",
        "or WebSocket transport.",
        "",
        "If you passed a document as a plain 'string' value, please use the `options.operationType`",
        "option to provide the operation type to perform. You can also use the 'gql' string literal",
        "processor to turn your string into a rich Document, on which inference always work.",
        "",
        "If you already provided the document a rich Document format via the 'gql` ...`' call, then it's",
        "probably a bug in this library. You can provide the `options.operationType` option to workaround",
        "the problem and report the bug to us with the document string used.",
        "",
        "Valid `options.operationType` values are either 'query', 'mutation' or 'subscription'.",
        "",
        "You can also force usage of WebSocket transport by providing the `options.onMessage` which",
        "forces the usage of the WebSocket transport."
      ]

      throw new DfuseError(messages.join("\n"))
    }

    if (operationType === "subscription" && !onMessageProvided) {
      const messages = [
        "The `options.onMessage` parameter is required for 'subscription' document.",
        "If your document is not a 'subscription' type, this is probably a bug with the library.",
        "You can provide the `options.operationType` option to workaroundthe problem and report",
        "the bug to us with the document string used."
      ]

      throw new DfuseError(messages.join("\n"))
    }

    // FIXME: Turn the document into a proper document string if a GraphQL document
    return await this.apiRequest<GraphqlResponse<T>>(
      "/graphql",
      "POST",
      {},
      { query: document as string, variables: options.variables }
    )
  }

  //
  /// WebSocket API
  //

  public streamActionTraces(
    data: GetActionTracesMessageData,
    onMessage: OnStreamMessage,
    options: StreamOptions = {}
  ): Promise<Stream> {
    return this.websocketStream(onMessage, (messageCreator, withDefaultOptions) =>
      messageCreator(
        OutboundMessageType.GET_ACTION_TRACES,
        data,
        withDefaultOptions({ listen: true, ...options })
      )
    )
  }

  public async streamTableRows(
    data: GetTableRowsMessageData,
    onMessage: OnStreamMessage,
    options: StreamOptions = {}
  ): Promise<Stream> {
    return this.websocketStream(onMessage, (messageCreator, withDefaultOptions) =>
      messageCreator(
        OutboundMessageType.GET_TABLE_ROWS,
        { json: true, ...data },
        withDefaultOptions({ listen: true, ...options })
      )
    )
  }

  public async streamTransaction(
    data: GetTransactionLifecycleMessageData,
    onMessage: OnStreamMessage,
    options: StreamOptions = {}
  ): Promise<Stream> {
    return this.websocketStream(onMessage, (messageCreator, withDefaultOptions) =>
      messageCreator(
        OutboundMessageType.GET_TRANSACTION_LIFECYCLE,
        data,
        withDefaultOptions({ listen: true, fetch: true, ...options })
      )
    )
  }

  public streamHeadInfo(onMessage: OnStreamMessage, options: StreamOptions = {}): Promise<Stream> {
    return this.websocketStream(onMessage, (messageCreator, withDefaultOptions) => {
      return messageCreator(
        OutboundMessageType.GET_HEAD_INFO,
        {},
        withDefaultOptions({ listen: true, ...options })
      )
    })
  }

  public websocketStream<T>(
    onMessage: OnStreamMessage,
    initMessageFactory: OutboundMessageFactory<T>
  ): Promise<Stream> {
    const message = initMessageFactory(createOutboundMessage, this.withDefaultOptions)

    return this.registerStream(message, onMessage)
  }

  private withDefaultOptions = (options: StreamOptions) => {
    return { req_id: `${this.requestIdGenerator()}-${this.id}`, ...options }
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

  public async stateTableRow<T = unknown>(
    account: string,
    scope: string,
    table: string,
    primaryKey: string,
    options: {
      blockNum?: number
      json?: boolean
      keyType?: StateKeyType
      withBlockNum?: boolean
      withAbi?: boolean
    } = {}
  ): Promise<StateTableRowResponse<T>> {
    return this.apiRequest<StateTableRowResponse<T>>(V0_STATE_TABLE_ROW, "GET", {
      account,
      scope,
      table,
      primary_key: primaryKey,
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
    return this.apiRequest<MultiStateResponse<T>>(
      V0_STATE_TABLES_ACCOUNTS,
      "POST",
      undefined,
      {
        accounts: accounts.join("|"),
        scope,
        table,
        block_num: options.blockNum,
        json: options.json === undefined ? true : options.json,
        key_type: options.keyType,
        with_block_num: options.withBlockNum,
        with_abi: options.withAbi
      },
      {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    )
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
    return this.apiRequest<MultiStateResponse<T>>(
      V0_STATE_TABLES_SCOPES,
      "POST",
      undefined,
      {
        account,
        scopes: scopes.join("|"),
        table,
        block_num: options.blockNum,
        json: options.json === undefined ? true : options.json,
        key_type: options.keyType,
        with_block_num: options.withBlockNum,
        with_abi: options.withAbi
      },
      {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    )
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

  private inferOperationType(
    document: string | GraphqlDocument,
    predefinedOperationType?: GraphqlOperationType
  ): GraphqlOperationType | undefined {
    this.debug(
      "Trying to infer operation type based on document and predefined operation type, predefined operation type '%s' and document %o",
      predefinedOperationType,
      document
    )
    if (predefinedOperationType) {
      this.debug("Predefined type '%s' provided, using it straight away.", predefinedOperationType)
      return predefinedOperationType
    }

    if (typeof document === "string") {
      this.debug("Document is a plain string type, performing a poor-man Regex extraction.")

      const matches = document.match(
        /^\s*(query|mutation|subscription)?\s*([_A-Za-z][_0-9A-Za-z]*\s*)?(\([^\)]*\)\s*)?{/
      )

      if (matches == null) {
        this.debug("Document string did not match our Regex, aborting inference.")
        return undefined
      }
      if (matches && matches[1]) {
        this.debug("Document string Regex matches have operation type '%s', using it.", matches[1])
        return matches[1] as GraphqlOperationType
      }

      this.debug("Document string Regex matches but operation type was not present, using 'query'.")
      return "query"
    }

    // FIXME: Make the initial AST walking and work our way through!
    return undefined
  }

  private onTokenRefresh = (apiToken: string) => {
    // Ensure we update the API token to have it at its latest value
    this.streamClient.setApiToken(apiToken)
    this.graphqlStreamClient.setApiToken(apiToken)
  }
}

function isValidDocumentType(type?: string): boolean {
  if (!type) {
    return false
  }

  return type === "subscription" || type === "query" || type === "mutation"
}

function randomReqId() {
  return `dc-${Math.random()
    .toString(16)
    .substr(2)}`
}
