import { EoswsClient, HttpClient } from "../client"
import { InboundMessage } from "../../message/inbound"
import { EoswsSocket } from "../socket"
import fetch from "jest-fetch-mock"
import { createMockEoswsSocket } from "./mocks"

describe("client", function() {
  let receivedMessages: Array<InboundMessage<any>>

  const mockSocket = createMockEoswsSocket()
  const socket = (mockSocket as any) as EoswsSocket
  const mockFetch = fetch
  beforeEach(() => {
    receivedMessages = []
  })

  describe("constructor", () => {
    it("should build the client", () => {
      const client = new EoswsClient({ socket, httpClient: mockFetch as any, baseUrl: "test.io" })
      expect(client.socket).toBeDefined()
    })
  })

  describe("connect", () => {
    it("should add a listener", async () => {
      const client = new EoswsClient({ socket, httpClient: mockFetch as any, baseUrl: "test.io" })
      await client.connect()
      expect(client.socket.connect).toHaveBeenCalled()
    })
  })

  describe("reconnect", () => {
    it("should add a listener", async () => {
      const client = new EoswsClient({ socket, httpClient: mockFetch as any, baseUrl: "test.io" })
      client.socket.isConnected = true
      await client.reconnect()
      expect(client.socket.disconnect).toHaveBeenCalled()
      expect(client.socket.connect).toHaveBeenCalled()
    })
  })

  describe("getNewApiToken", () => {
    it("should ", function() {
      // @ts-ignore
      mockFetch.mockResponses([JSON.stringify({ token: "token", expires_at: 123456 })])
      const client = new EoswsClient({ socket, httpClient: mockFetch as any, baseUrl: "test.io" })
      client.getNewApiToken("abc")
      expect(mockFetch).toHaveBeenCalledWith("test.io/v1/auth/issue", {
        method: "post",
        body: JSON.stringify({ api_key: "abc" })
      })
    })
  })

  describe("getActionTraces", () => {
    it("should return the same object as the basic send", () => {
      const client = new EoswsClient({ socket, httpClient: mockFetch as any, baseUrl: "test.io" })

      expect(
        client.getActionTraces(
          { receiver: "test", account: "account_name", action_name: "test" },
          { req_id: "abc" }
        )
      ).toEqual({ reqId: "abc", onMessage: expect.any(Function), unlisten: expect.any(Function) })
    })
  })

  describe("getTableRows", () => {
    it("should return the same object as the basic send", () => {
      const client = new EoswsClient({ socket, httpClient: mockFetch as any, baseUrl: "test.io" })

      expect(
        client.getTableRows({ scope: "test", code: "code", table: "test" }, { req_id: "abc" })
      ).toEqual({ reqId: "abc", onMessage: expect.any(Function), unlisten: expect.any(Function) })
    })
  })

  describe("getTransaction", () => {
    it("should return the same object as the basic send", () => {
      const client = new EoswsClient({ socket, httpClient: mockFetch as any, baseUrl: "test.io" })

      expect(client.getTransactionLifecycle("id", { listen: true, req_id: "abc" })).toEqual({
        reqId: "abc",
        onMessage: expect.any(Function),
        unlisten: expect.any(Function)
      })
    })
  })
})
