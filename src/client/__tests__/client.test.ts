import { createDfuseClient, networkToEndpoint } from "../client"
import { DfuseClient, RequestIdGenerator } from "../../types/client"
import { MockHttpClient, MockStreamClient, MockApiTokenStore, MockRefreshScheduler } from "./mocks"
import { InboundMessageType } from "../../message/inbound"
import { OutboundMessageType } from "../../message/outbound"

const defaultRequestId = "dc-123"

// In milliseconds
const currentDate = 1000000

// Expirations is in seconds!
const nonExpiredApiTokenInfo = { token: "non-expired-far", expires_at: 2000 }

describe("DfuseClient", () => {
  let httpClient: MockHttpClient
  let streamClient: MockStreamClient
  let apiTokenStore: MockApiTokenStore
  let refreshScheduler: MockRefreshScheduler
  let requestIdGenerator: RequestIdGenerator
  let client: DfuseClient

  beforeEach(() => {
    spyOn(Date, "now").and.returnValue(currentDate)

    httpClient = new MockHttpClient()
    streamClient = new MockStreamClient()
    apiTokenStore = new MockApiTokenStore()
    refreshScheduler = new MockRefreshScheduler()
    requestIdGenerator = jest.fn<string>(() => defaultRequestId)

    apiTokenStore.getMock.mockReturnValue(Promise.resolve(nonExpiredApiTokenInfo))

    client = createDfuseClient({
      apiKey: "key",
      network: "mainnet",
      httpClient,
      streamClient,
      apiTokenStore,
      refreshScheduler,
      requestIdGenerator
    })
  })

  it("refresh stream token on token refresh", async (done) => {
    // This is way too hacky, but the ApiTokenManager is not a dependencies of DfuseClient,
    // so, let's go the long way ... We call a function of the client so it will schedule
    // a refresh, once the call has been made, we can inspect our mock to retrieve the
    // onTokenRefresh callback.
    await client.stateAbi("eosio")

    expect(refreshScheduler.scheduleMock).toHaveBeenCalledTimes(1)

    const refresher = refreshScheduler.scheduleMock.mock.calls[0][1]
    streamClient.socket.setApiTokenMock.mockImplementation((token: string) => {
      expect(token).toEqual("refreshed-token")
      done()
    })

    const data = { token: "refreshed-token", expires_at: 10 }
    httpClient.authRequestMock.mockReturnValue(Promise.resolve(data))

    refresher()
  })

  describe("stream", () => {
    it("correctly register action traces stream with default options", async () => {
      const onMessage = jest.fn()
      const stream = { id: "any", unlisten: () => Promise.resolve() }

      streamClient.registerStreamMock.mockReturnValue(Promise.resolve(stream))
      const result = await client.streamActionTraces({ account: "test" }, onMessage)

      expect(result).toEqual(stream)

      expect(streamClient.socket.setApiTokenMock).toHaveBeenCalledTimes(1)
      expect(streamClient.socket.setApiTokenMock).toHaveBeenCalledWith(nonExpiredApiTokenInfo.token)

      expect(streamClient.registerStreamMock).toHaveBeenCalledTimes(1)
      expect(streamClient.registerStreamMock).toHaveBeenCalledWith(
        {
          type: OutboundMessageType.GET_ACTION_TRACES,
          data: { account: "test" },
          listen: true,
          req_id: defaultRequestId
        },
        onMessage
      )
    })

    it("correctly register action traces stream with overridden options", async () => {
      const onMessage = jest.fn()
      await client.streamActionTraces({ account: "test" }, onMessage, {
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
          data: { account: "test" },
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
      const stream = { id: "any", unlisten: () => Promise.resolve() }

      streamClient.registerStreamMock.mockReturnValue(Promise.resolve(stream))
      const result = await client.streamTableRows(
        { code: "test", table: "eosio", scope: "eosio" },
        onMessage
      )

      expect(result).toEqual(stream)

      expect(streamClient.socket.setApiTokenMock).toHaveBeenCalledTimes(1)
      expect(streamClient.socket.setApiTokenMock).toHaveBeenCalledWith(nonExpiredApiTokenInfo.token)

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
      const stream = { id: "any", unlisten: () => Promise.resolve() }

      streamClient.registerStreamMock.mockReturnValue(Promise.resolve(stream))
      const result = await client.streamTransaction({ id: "123" }, onMessage)

      expect(result).toEqual(stream)

      expect(streamClient.socket.setApiTokenMock).toHaveBeenCalledTimes(1)
      expect(streamClient.socket.setApiTokenMock).toHaveBeenCalledWith(nonExpiredApiTokenInfo.token)

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
      const stream = { id: "any", unlisten: () => Promise.resolve() }

      streamClient.registerStreamMock.mockReturnValue(Promise.resolve(stream))
      const result = await client.streamHeadInfo(onMessage)

      expect(result).toEqual(stream)

      expect(streamClient.socket.setApiTokenMock).toHaveBeenCalledTimes(1)
      expect(streamClient.socket.setApiTokenMock).toHaveBeenCalledWith(nonExpiredApiTokenInfo.token)

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
      expect(httpClient.authRequestMock).toHaveBeenCalledWith("/v1/auth/issue", "POST", undefined, {
        api_key: "123"
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
          block_count: 9007199254740991,
          q: "123"
        },
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
        { account: "eosio", hex_rows: ["01"], table: "table" }
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
        { account: "eosio", block_num: 10, hex_rows: ["01"], table: "table" }
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
        "GET",
        { accounts: "eosio|second", scope: "scope", table: "table", json: true },
        undefined
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
        "GET",
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
        undefined
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
        "GET",
        { account: "eosio", scopes: "scope|second", table: "table", json: true },
        undefined
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
        "GET",
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
        undefined
      )
    })
  })
})

describe("networkToEndpoint", () => {
  const testCases = [
    { network: "mainnet", endpoint: "mainnet.eos.dfuse.io" },
    { network: "jungle", endpoint: "jungle.eos.dfuse.io" },
    { network: "kylin", endpoint: "kylin.eos.dfuse.io" },
    { network: "other", endpoint: "other" },
    { network: "something.eos.dfuse.io", endpoint: "something.eos.dfuse.io" }
  ]

  testCases.forEach((testCase) => {
    it(`should pass test case ${testCase.network}`, () => {
      expect(networkToEndpoint(testCase.network)).toEqual(testCase.endpoint)
    })
  })
})
