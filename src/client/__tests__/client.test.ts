import { EoswsClient, HttpClient } from "../client"
import { InboundMessage } from "../../message/inbound"
import { EoswsSocket } from "../socket"
import fetch from "jest-fetch-mock"
import { createMockEoswsSocket } from "./mocks"

describe("client", function() {
  let receivedMessages: Array<InboundMessage<any>>

  const mockSocket = createMockEoswsSocket()
  const socket = (mockSocket as any) as EoswsSocket
  const mockFetch = fetch as HttpClient
  beforeEach(() => {
    receivedMessages = []
  })

  describe("constructor", () => {
    it("should build the client", () => {
      const client = new EoswsClient({ socket, httpClient: mockFetch, baseUrl: "test.io" })
      expect(client.socket).toBeDefined()
    })
  })

  describe("connect", () => {
    it("should add a listener", async () => {
      const client = new EoswsClient({ socket, httpClient: mockFetch, baseUrl: "test.io" })

      await client.connect()
      expect(client.socket.connect).toHaveBeenCalled()
    })
  })

  describe("getActionTraces", () => {
    it("should return the same object as the basic send", () => {
      const client = new EoswsClient({ socket, httpClient: mockFetch, baseUrl: "test.io" })

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
      const client = new EoswsClient({ socket, httpClient: mockFetch, baseUrl: "test.io" })

      expect(
        client.getTableRows({ scope: "test", code: "code", table: "test" }, { req_id: "abc" })
      ).toEqual({ reqId: "abc", onMessage: expect.any(Function), unlisten: expect.any(Function) })
    })
  })

  describe("getTransaction", () => {
    it("should return the same object as the basic send", () => {
      const client = new EoswsClient({ socket, httpClient: mockFetch, baseUrl: "test.io" })

      expect(client.getTransactionLifecycle("id", { listen: true, req_id: "abc" })).toEqual({
        reqId: "abc",
        onMessage: expect.any(Function),
        unlisten: expect.any(Function)
      })
    })
  })
})
