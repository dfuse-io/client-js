import { EoswsClient } from "../eosws-client"
import { InboundMessage } from "../inbound"
import {
  GetActionTracesMessageBackendParameters,
  OutboundMessage,
  OutboundMessageType
} from "../outbound"

describe("EoswsClient", function() {
  let controller: ReturnType<typeof createSocketController>
  let factory: () => WebSocket
  let receivedMessages: Array<InboundMessage<any>>

  beforeEach(() => {
    controller = createSocketController()
    factory = () => controller as any
    receivedMessages = []
  })

  describe("constructor", () => {
    it("should build the client", () => {
      const client = new EoswsClient(factory)
      expect(client.client).toBeDefined()
    })
  })

  describe("connect", () => {
    it("should add a listener", () => {
      const client = new EoswsClient(factory)
      spyOn(client.client, "connect")
      client.connect()
      expect(client.client.connect).toHaveBeenCalled()
    })
  })

  describe("send", () => {
    it("return a listener if listen is set to true", () => {
      const client = new EoswsClient(factory)
      expect(
        client.send<OutboundMessage<GetActionTracesMessageBackendParameters>>(basicGetActionMessage)
      ).toEqual({ requestId: "abc", listen: expect.any(Function), unlisten: expect.any(Function) })
    })

    it("should return null if listen is set to false", () => {
      const client = new EoswsClient(factory)
      expect(
        client.send<OutboundMessage<GetActionTracesMessageBackendParameters>>(
          Object.assign({}, basicGetActionMessage, { listen: false })
        )
      ).toEqual(null)
    })
  })

  describe("getActionTraces", () => {
    it("should return the same object as the basic send", () => {
      const client = new EoswsClient(factory)

      expect(
        client.getActionTraces(
          { receiver: "test", account: "account_name", actionName: "test" },
          { listen: true, requestId: "abc" }
        )
      ).toEqual({ requestId: "abc", listen: expect.any(Function), unlisten: expect.any(Function) })
    })
  })

  describe("getTableRows", () => {
    it("should return the same object as the basic send", () => {
      const client = new EoswsClient(factory)

      expect(
        client.getTableRows(
          { scope: "test", code: "code", tableName: "test" },
          { listen: true, requestId: "abc" }
        )
      ).toEqual({ requestId: "abc", listen: expect.any(Function), unlisten: expect.any(Function) })
    })
  })

  describe("getTransaction", () => {
    it("should return the same object as the basic send", () => {
      const client = new EoswsClient(factory)

      expect(client.getTransaction("id", { listen: true, requestId: "abc" })).toEqual({
        requestId: "abc",
        listen: expect.any(Function),
        unlisten: expect.any(Function)
      })
    })
  })
})

const basicGetActionMessage = {
  type: OutboundMessageType.GET_ACTION_TRACES,
  listen: true,
  req_id: "abc",
  data: { receiver: "test", account: "account_name", action_name: "test" }
}

interface WebSocketController {
  close: jest.Mock<() => void>
  send: jest.Mock<(data: any) => void>

  onclose?: (event: CloseEvent) => void
  onerror?: (event: Event) => void
  onopen?: () => void
  onmessage?: (event: MessageEvent) => void
}

function createSocketController(): WebSocketController {
  return {
    close: jest.fn<() => void>(),
    send: jest.fn<(data: any) => void>()
  }
}
