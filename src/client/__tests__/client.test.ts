import { EoswsClient } from "../client"
import { InboundMessage } from "../../message/inbound"
import { EoswsSocket } from "../socket"

describe("client", function() {
  let receivedMessages: Array<InboundMessage<any>>

  const mockSocket = createMockEoswsSocket()
  const socket = (mockSocket as any) as EoswsSocket

  beforeEach(() => {
    receivedMessages = []
  })

  describe("constructor", () => {
    it("should build the client", () => {
      const client = new EoswsClient(socket)
      expect(client.socket).toBeDefined()
    })
  })

  describe("connect", () => {
    it("should add a listener", async () => {
      const client = new EoswsClient(socket)

      await client.connect()
      expect(client.socket.connect).toHaveBeenCalled()
    })
  })

  describe("getActionTraces", () => {
    it("should return the same object as the basic send", () => {
      const client = new EoswsClient(socket)

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
      const client = new EoswsClient(socket)

      expect(
        client.getTableRows({ scope: "test", code: "code", table: "test" }, { req_id: "abc" })
      ).toEqual({ reqId: "abc", onMessage: expect.any(Function), unlisten: expect.any(Function) })
    })
  })

  describe("getTransaction", () => {
    it("should return the same object as the basic send", () => {
      const client = new EoswsClient(socket)

      expect(client.getTransactionLifecycle("id", { listen: true, req_id: "abc" })).toEqual({
        reqId: "abc",
        onMessage: expect.any(Function),
        unlisten: expect.any(Function)
      })
    })
  })
})

function createMockEoswsSocket() {
  return {
    isConnected: false,

    connect: jest.fn<Promise<void>>(() => new Promise((resolve) => resolve())),
    disconnect: jest.fn<Promise<void>>(() => new Promise((resolve) => resolve())),

    send: jest.fn<Promise<void>>()
  }
}
