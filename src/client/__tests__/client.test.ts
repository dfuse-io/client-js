import { createDfuseClient, networkToEndpoint } from "../client"
import { DfuseClient, RequestIdGenerator } from "../../types/client"
import {
  MockHttpClient,
  MockStreamClient,
  MockApiTokenStore,
  MockRefreshScheduler,
  mock,
  MockGraphqlStreamClient
} from "./mocks"
import { OutboundMessageType } from "../../message/outbound"
import { Stream } from "../../types/stream"
import { DfuseError } from "../../types/error"
import { OnGraphqlStreamMessage } from "../../types/graphql-stream-client"

const defaultRequestId = "dc-123"

// In milliseconds
const currentDate = 1000000

// Expirations is in seconds!
const nonExpiredApiTokenInfo = { token: "non-expired-far", expires_at: 2000 }

describe("DfuseClient", () => {
  let httpClient: MockHttpClient
  let streamClient: MockStreamClient
  let graphqlStreamClient: MockGraphqlStreamClient
  let apiTokenStore: MockApiTokenStore
  let refreshScheduler: MockRefreshScheduler
  let requestIdGenerator: RequestIdGenerator
  let client: DfuseClient

  beforeEach(() => {
    spyOn(Date, "now").and.returnValue(currentDate)

    httpClient = new MockHttpClient()
    streamClient = new MockStreamClient()
    graphqlStreamClient = new MockGraphqlStreamClient()
    apiTokenStore = new MockApiTokenStore()
    refreshScheduler = new MockRefreshScheduler()
    requestIdGenerator = mock<string>(() => defaultRequestId)

    apiTokenStore.getMock.mockReturnValue(Promise.resolve(nonExpiredApiTokenInfo))

    client = createDfuseClient({
      apiKey: "web_0123456789abcdef",
      network: "mainnet",
      httpClient,
      streamClient,
      graphqlStreamClient,
      apiTokenStore,
      refreshScheduler,
      requestIdGenerator
    })
  })

  it("releases http and stream clients on release", () => {
    client.release()
    expect(httpClient.releaseMock).toHaveBeenCalledTimes(1)
    expect(streamClient.releaseMock).toHaveBeenCalledTimes(1)
    expect(apiTokenStore.releaseMock).toHaveBeenCalledTimes(1)
    expect(refreshScheduler.releaseMock).toHaveBeenCalledTimes(1)
  })

  it("accepts valid API key in upper case (in createDfuseClient)", () => {
    expect(() => {
      createDfuseClient({
        apiKey: "WEB_0123456789ABCDEF",
        network: "mainnet",
        httpClient,
        streamClient,
        apiTokenStore,
        refreshScheduler,
        requestIdGenerator
      })
    }).not.toThrow()
  })

  it("correctly checks API key (in createDfuseClient)", () => {
    try {
      createDfuseClient({ apiKey: "web_!!!!!!", network: "mainnet" })
      fail("Should have thrown a DfuseError")
    } catch (error) {
      expect(error).toBeInstanceOf(DfuseError)

      // Let's just check how many lines there is an not the actual message
      expect(error.message.split("\n").length, error.message).toEqual(5)
    }
  })

  it("correctly checks API key, handling invalid API token (in createDfuseClient)", () => {
    try {
      createDfuseClient({ apiKey: "eye.1hash17.values", network: "mainnet" })
      fail("Should have thrown a DfuseError")
    } catch (error) {
      expect(error).toBeInstanceOf(DfuseError)

      // Let's just check how many lines there is an not the actual message
      expect(error.message.split("\n").length, error.message).toEqual(13)
    }
  })

  it("refresh stream token on token refresh", async (done) => {
    // This is way too hacky, but the ApiTokenManager is not a dependencies of DfuseClient,
    // so, let's go the long way ... We call a function of the client so it will schedule
    // a refresh, once the call has been made, we can inspect our mock to retrieve the
    // onTokenRefresh callback.
    await client.stateAbi("eosio")

    expect(refreshScheduler.scheduleMock).toHaveBeenCalledTimes(1)

    const refresher = refreshScheduler.scheduleMock.mock.calls[0][1]
    streamClient.setApiTokenMock.mockImplementation((token: string) => {
      expect(token).toEqual("refreshed-token")
      done()
    })

    const data = { token: "refreshed-token", expires_at: 10 }
    httpClient.authRequestMock.mockReturnValue(Promise.resolve(data))

    refresher()
  })

  describe("graphql", () => {
    it("correctly pass default operation type document through http", async () => {
      httpClient.apiRequestMock.mockReturnValue(Promise.resolve({ data: "response" }))

      await expect(client.graphql("{ doc }")).resolves.toEqual({ data: "response" })
    })

    it("correctly pass query operation type document through http", async () => {
      httpClient.apiRequestMock.mockReturnValue(Promise.resolve({ data: "response" }))

      await expect(client.graphql("query { doc }")).resolves.toEqual({ data: "response" })
    })

    it("correctly pass mutation operation type document through http", async () => {
      httpClient.apiRequestMock.mockReturnValue(Promise.resolve({ data: "response" }))

      await expect(client.graphql("mutation { doc }")).resolves.toEqual({ data: "response" })
    })

    it("correctly pass subscription operation type document through WebSocket", async () => {
      const stream: Stream = { id: "any", close: () => Promise.resolve() } as any
      graphqlStreamClient.registerStreamMock.mockReturnValue(Promise.resolve(stream))

      const streamOnMessage = mock<OnGraphqlStreamMessage>()
      await expect(client.graphql("subscription { doc }", streamOnMessage)).resolves.toEqual(stream)
    })

    it("is an error to have subscription document without providing the onMesage options", async () => {
      const stream: Stream = { id: "any", close: () => Promise.resolve() } as any
      graphqlStreamClient.registerStreamMock.mockReturnValue(Promise.resolve(stream))

      await expect(
        client.graphql("subscription { doc }")
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `
"The \`options.onMessage\` parameter is required for 'subscription' document.
If your document is not a 'subscription' type, this is probably a bug with the library.
You can provide the \`options.operationType\` option to workaroundthe problem and report
the bug to us with the document string used."
`
      )
    })

    it("correctly validates the operation type when provided", async () => {
      await expect(
        // @ts-ignore operationType is wrong on purpose
        client.graphql("", { operationType: "random" })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The 'options.operationType' value 'random' is invalid, it must be either 'query', 'mutation' or 'subscription')."`
      )
    })

    it("always uses WebSocket when onMessage options is defined", async () => {
      const stream: Stream = { id: "any", close: () => Promise.resolve() } as any
      graphqlStreamClient.registerStreamMock.mockReturnValue(Promise.resolve(stream))

      const streamOnMessage = mock<OnGraphqlStreamMessage>()
      await expect(
        client.graphql("mutation { doc }", streamOnMessage, { operationType: "query" })
      ).resolves.toEqual(stream)
    })

    it("uses operationType over inferred value when present", async () => {
      httpClient.apiRequestMock.mockReturnValue(Promise.resolve({ data: "response" }))

      await expect(
        client.graphql("subscription { doc }", { operationType: "query" })
      ).resolves.toEqual({ data: "response" })
    })

    it("correctly passes variables via HTTP", async () => {
      httpClient.apiRequestMock.mockReturnValue(Promise.resolve({ data: "response" }))

      await expect(
        client.graphql("query { doc }", { variables: { any: "value" } })
      ).resolves.toEqual({ data: "response" })

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/graphql",
        "POST",
        {},
        { query: "query { doc }", variables: { any: "value" } },
        undefined
      )
    })
  })

  describe("stream", () => {
    it("correctly register action traces stream with default options", async () => {
      const onMessage = jest.fn()
      const stream: Stream = { id: "any", unlisten: () => Promise.resolve() } as any

      streamClient.registerStreamMock.mockReturnValue(Promise.resolve(stream))
      const result = await client.streamActionTraces({ accounts: "test" }, onMessage)

      expect(result).toEqual(stream)

      expect(streamClient.setApiTokenMock).toHaveBeenCalledTimes(1)
      expect(streamClient.setApiTokenMock).toHaveBeenCalledWith(nonExpiredApiTokenInfo.token)

      expect(streamClient.registerStreamMock).toHaveBeenCalledTimes(1)
      expect(streamClient.registerStreamMock).toHaveBeenCalledWith(
        {
          type: OutboundMessageType.GET_ACTION_TRACES,
          data: { accounts: "test" },
          listen: true,
          req_id: defaultRequestId
        },
        onMessage
      )
    })

    it("correctly register action traces stream with overridden options", async () => {
      const onMessage = jest.fn()
      await client.streamActionTraces({ accounts: "test" }, onMessage, {
        req_id: "dc-fixed",
        fetch: true,
        listen: false,
        start_block: 10,
        with_progress: 1
      })

      expect(streamClient.registerStreamMock).toHaveBeenCalledTimes(1)
      expect(streamClient.registerStreamMock).toHaveBeenCalledWith(
        {
          type: OutboundMessageType.GET_ACTION_TRACES,
          data: { accounts: "test" },
          fetch: true,
          listen: false,
          req_id: "dc-fixed",
          start_block: 10,
          with_progress: 1
        },
        onMessage
      )
    })

    it("correctly register table rows stream with default options", async () => {
      const onMessage = jest.fn()
      const stream: Stream = { id: "any", unlisten: () => Promise.resolve() } as any

      streamClient.registerStreamMock.mockReturnValue(Promise.resolve(stream))
      const result = await client.streamTableRows(
        { code: "test", table: "eosio", scope: "eosio" },
        onMessage
      )

      expect(result).toEqual(stream)

      expect(streamClient.setApiTokenMock).toHaveBeenCalledTimes(1)
      expect(streamClient.setApiTokenMock).toHaveBeenCalledWith(nonExpiredApiTokenInfo.token)

      expect(streamClient.registerStreamMock).toHaveBeenCalledTimes(1)
      expect(streamClient.registerStreamMock).toHaveBeenCalledWith(
        {
          type: OutboundMessageType.GET_TABLE_ROWS,
          data: { code: "test", table: "eosio", scope: "eosio", json: true },
          listen: true,
          req_id: defaultRequestId
        },
        onMessage
      )
    })

    it("correctly register table rows stream with overridden options", async () => {
      const onMessage = jest.fn()
      await client.streamTableRows(
        { code: "test", table: "eosio", scope: "eosio", json: false },
        onMessage,
        {
          req_id: "dc-fixed",
          fetch: true,
          listen: false,
          start_block: 10,
          with_progress: 1
        }
      )

      expect(streamClient.registerStreamMock).toHaveBeenCalledTimes(1)
      expect(streamClient.registerStreamMock).toHaveBeenCalledWith(
        {
          type: OutboundMessageType.GET_TABLE_ROWS,
          data: { code: "test", table: "eosio", scope: "eosio", json: false },
          fetch: true,
          listen: false,
          req_id: "dc-fixed",
          start_block: 10,
          with_progress: 1
        },
        onMessage
      )
    })

    it("correctly register transaction stream with default options", async () => {
      const onMessage = jest.fn()
      const stream: Stream = { id: "any", unlisten: () => Promise.resolve() } as any

      streamClient.registerStreamMock.mockReturnValue(Promise.resolve(stream))
      const result = await client.streamTransaction({ id: "123" }, onMessage)

      expect(result).toEqual(stream)

      expect(streamClient.setApiTokenMock).toHaveBeenCalledTimes(1)
      expect(streamClient.setApiTokenMock).toHaveBeenCalledWith(nonExpiredApiTokenInfo.token)

      expect(streamClient.registerStreamMock).toHaveBeenCalledTimes(1)
      expect(streamClient.registerStreamMock).toHaveBeenCalledWith(
        {
          type: OutboundMessageType.GET_TRANSACTION_LIFECYCLE,
          data: { id: "123" },
          fetch: true,
          listen: true,
          req_id: defaultRequestId
        },
        onMessage
      )
    })

    it("correctly register transaction stream with overridden options", async () => {
      const onMessage = jest.fn()
      await client.streamTransaction({ id: "123" }, onMessage, {
        req_id: "dc-fixed",
        fetch: false,
        listen: false,
        start_block: 10,
        with_progress: 1
      })

      expect(streamClient.registerStreamMock).toHaveBeenCalledTimes(1)
      expect(streamClient.registerStreamMock).toHaveBeenCalledWith(
        {
          type: OutboundMessageType.GET_TRANSACTION_LIFECYCLE,
          data: { id: "123" },
          fetch: false,
          listen: false,
          req_id: "dc-fixed",
          start_block: 10,
          with_progress: 1
        },
        onMessage
      )
    })

    it("correctly register head info stream with default options", async () => {
      const onMessage = jest.fn()
      const stream: Stream = { id: "any", unlisten: () => Promise.resolve() } as any

      streamClient.registerStreamMock.mockReturnValue(Promise.resolve(stream))
      const result = await client.streamHeadInfo(onMessage)

      expect(result).toEqual(stream)

      expect(streamClient.setApiTokenMock).toHaveBeenCalledTimes(1)
      expect(streamClient.setApiTokenMock).toHaveBeenCalledWith(nonExpiredApiTokenInfo.token)

      expect(streamClient.registerStreamMock).toHaveBeenCalledTimes(1)
      expect(streamClient.registerStreamMock).toHaveBeenCalledWith(
        {
          type: OutboundMessageType.GET_HEAD_INFO,
          data: {},
          listen: true,
          req_id: defaultRequestId
        },
        onMessage
      )
    })

    it("correctly register head info stream with overridden options", async () => {
      const onMessage = jest.fn()
      await client.streamHeadInfo(onMessage, {
        req_id: "dc-fixed",
        fetch: true,
        listen: false,
        start_block: 10,
        with_progress: 1
      })

      expect(streamClient.registerStreamMock).toHaveBeenCalledTimes(1)
      expect(streamClient.registerStreamMock).toHaveBeenCalledWith(
        {
          type: OutboundMessageType.GET_HEAD_INFO,
          data: {},
          fetch: true,
          listen: false,
          req_id: "dc-fixed",
          start_block: 10,
          with_progress: 1
        },
        onMessage
      )
    })
  })

  describe("http", () => {
    it("correctly forwards authIssue to underlying http client", async () => {
      const data = { token: "test", expires_at: 10 }

      httpClient.authRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.authIssue("123")

      expect(result).toEqual(data)

      expect(httpClient.authRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.authRequestMock).toHaveBeenCalledWith(
        "/v1/auth/issue",
        "POST",
        undefined,
        {
          api_key: "123"
        },
        undefined
      )
    })

    it("correctly forwards fetchTransaction to underlying http client", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.fetchTransaction("123")

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/transactions/123",
        "GET",
        undefined,
        undefined,
        undefined
      )
    })

    it("correctly forwards fetchBlockIdByTime to underlying http client, string time", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.fetchBlockIdByTime("2015-01-01T01:01:01.6Z", "gte")

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/block_id/by_time",
        "GET",
        { time: "2015-01-01T01:01:01.6Z", comparator: "gte" },
        undefined,
        undefined
      )
    })

    const values = ["2015-01-01T05:01:01.6Z", "2015-01-01T01:01:01.6-04:00"]
    values.forEach((input) => {
      it(`correctly forwards fetchBlockIdByTime to underlying http client, Date [${input}] time`, async () => {
        const data = { field: true }
        const date = new Date(input)

        httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
        const result = await client.fetchBlockIdByTime(date, "gte")

        expect(result).toEqual(data)

        expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
        expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
          nonExpiredApiTokenInfo.token,
          "/v0/block_id/by_time",
          "GET",
          { time: "2015-01-01T05:01:01.600Z", comparator: "gte" },
          undefined,
          undefined
        )
      })
    })

    it("correctly forwards searchTransactions to underlying http client, all defaults", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.searchTransactions("123")

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/search/transactions",
        "GET",
        {
          block_count: 2147483647,
          q: "123"
        },
        undefined,
        undefined
      )
    })

    it("correctly forwards searchTransactions to underlying http client, all custom", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.searchTransactions("123", {
        blockCount: 10,
        cursor: "cursor",
        limit: 1,
        sort: "desc",
        startBlock: 10,
        withReversible: true
      })

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/search/transactions",
        "GET",
        {
          block_count: 10,
          cursor: "cursor",
          limit: 1,
          q: "123",
          sort: "desc",
          start_block: 10,
          with_reversible: true
        },
        undefined,
        undefined
      )
    })

    it("correctly forwards stateAbi to underlying http client, all defaults", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateAbi("eosio")

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/abi",
        "GET",
        { account: "eosio", json: true },
        undefined,
        undefined
      )
    })

    it("correctly forwards stateAbi to underlying http client, all custom", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateAbi("eosio", {
        blockNum: 10,
        json: false
      })

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/abi",
        "GET",
        { account: "eosio", block_num: 10, json: false },
        undefined,
        undefined
      )
    })

    it("correctly forwards stateAbiBinToJson to underlying http client, all defaults", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateAbiBinToJson("eosio", "table", ["01"])

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/abi/bin_to_json",
        "POST",
        undefined,
        { account: "eosio", hex_rows: ["01"], table: "table" },
        undefined
      )
    })

    it("correctly forwards stateAbiBinToJson to underlying http client, all custom", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateAbiBinToJson("eosio", "table", ["01"], {
        blockNum: 10
      })

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/abi/bin_to_json",
        "POST",
        undefined,
        { account: "eosio", block_num: 10, hex_rows: ["01"], table: "table" },
        undefined
      )
    })

    it("correctly forwards stateKeyAccounts to underlying http client, all defaults", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateKeyAccounts("pubKey")

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/key_accounts",
        "GET",
        { public_key: "pubKey" },
        undefined,
        undefined
      )
    })

    it("correctly forwards stateKeyAccounts to underlying http client, all custom", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateKeyAccounts("pubKey", {
        blockNum: 10
      })

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/key_accounts",
        "GET",
        { block_num: 10, public_key: "pubKey" },
        undefined,
        undefined
      )
    })

    it("correctly forwards statePermissionLinks to underlying http client, all defaults", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.statePermissionLinks("eosio")

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/permission_links",
        "GET",
        { account: "eosio" },
        undefined,
        undefined
      )
    })

    it("correctly forwards statePermissionLinks to underlying http client, all custom", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.statePermissionLinks("eosio", {
        blockNum: 10
      })

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/permission_links",
        "GET",
        { account: "eosio", block_num: 10 },
        undefined,
        undefined
      )
    })

    it("correctly forwards stateTableScopes to underlying http client, all defaults", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateTableScopes("eosio", "table")

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/table_scopes",
        "GET",
        { account: "eosio", table: "table" },
        undefined,
        undefined
      )
    })

    it("correctly forwards stateTableScopes to underlying http client, all custom", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateTableScopes("eosio", "table", {
        blockNum: 10
      })

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/table_scopes",
        "GET",
        { account: "eosio", table: "table", block_num: 10 },
        undefined,
        undefined
      )
    })

    it("correctly forwards stateTable to underlying http client, all defaults", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateTable("eosio", "scope", "table")

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/table",
        "GET",
        { account: "eosio", scope: "scope", table: "table", json: true },
        undefined,
        undefined
      )
    })

    it("correctly forwards stateTable to underlying http client, all custom", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateTable("eosio", "scope", "table", {
        blockNum: 10,
        json: false,
        keyType: "hex_be",
        withAbi: true,
        withBlockNum: false
      })

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/table",
        "GET",
        {
          account: "eosio",
          block_num: 10,
          json: false,
          key_type: "hex_be",
          scope: "scope",
          table: "table",
          with_abi: true,
          with_block_num: false
        },
        undefined,
        undefined
      )
    })

    it("correctly forwards stateTablesForAccounts to underlying http client, all defaults", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateTablesForAccounts(["eosio", "second"], "scope", "table")

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/tables/accounts",
        "POST",
        undefined,
        { accounts: "eosio|second", scope: "scope", table: "table", json: true },
        { "Content-Type": "application/x-www-form-urlencoded" }
      )
    })

    it("correctly forwards stateTablesForAccounts to underlying http client, all custom", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateTablesForAccounts(["eosio", "second"], "scope", "table", {
        blockNum: 10,
        json: false,
        keyType: "hex_be",
        withAbi: true,
        withBlockNum: false
      })

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/tables/accounts",
        "POST",
        undefined,
        {
          accounts: "eosio|second",
          block_num: 10,
          json: false,
          key_type: "hex_be",
          scope: "scope",
          table: "table",
          with_abi: true,
          with_block_num: false
        },
        { "Content-Type": "application/x-www-form-urlencoded" }
      )
    })

    it("correctly forwards stateTablesForScopes to underlying http client, all defaults", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateTablesForScopes("eosio", ["scope", "second"], "table")

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/tables/scopes",
        "POST",
        undefined,
        { account: "eosio", scopes: "scope|second", table: "table", json: true },
        { "Content-Type": "application/x-www-form-urlencoded" }
      )
    })

    it("correctly forwards stateTablesForScopes to underlying http client, all custom", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.stateTablesForScopes("eosio", ["scope", "second"], "table", {
        blockNum: 10,
        json: false,
        keyType: "hex_be",
        withAbi: true,
        withBlockNum: false
      })

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/v0/state/tables/scopes",
        "POST",
        undefined,
        {
          account: "eosio",
          block_num: 10,
          json: false,
          key_type: "hex_be",
          scopes: "scope|second",
          table: "table",
          with_abi: true,
          with_block_num: false
        },
        { "Content-Type": "application/x-www-form-urlencoded" }
      )
    })

    it("correctly forwards apiRequest to underlying http client, all custom", async () => {
      const data = { field: true }

      httpClient.apiRequestMock.mockReturnValue(Promise.resolve(data))
      const result = await client.apiRequest("/", "PUT", { param: 1 }, "body", { Custom: "true" })

      expect(result).toEqual(data)

      expect(httpClient.apiRequestMock).toHaveBeenCalledTimes(1)
      expect(httpClient.apiRequestMock).toHaveBeenCalledWith(
        nonExpiredApiTokenInfo.token,
        "/",
        "PUT",
        { param: 1 },
        "body",
        {
          Custom: "true"
        }
      )
    })
  })
})

describe("networkToEndpoint", () => {
  const testCases = [
    { network: "mainnet", endpoint: "mainnet.eos.dfuse.io" },
    { network: "jungle", endpoint: "jungle.eos.dfuse.io" },
    { network: "kylin", endpoint: "kylin.eos.dfuse.io" },
    { network: "worbli", endpoint: "worbli.eos.dfuse.io" },
    { network: "other", endpoint: "other" },
    { network: "something.eos.dfuse.io", endpoint: "something.eos.dfuse.io" }
  ]

  testCases.forEach((testCase) => {
    it(`should pass test case ${testCase.network}`, () => {
      expect(networkToEndpoint(testCase.network)).toEqual(testCase.endpoint)
    })
  })
})
