import { InboundMessageType, InboundMessage } from "../../message/inbound"
import { createStreamClient } from "../stream-client"
import { StreamClient } from "../../types/stream-client"
import { MockSocket } from "./mocks"
import { OutboundMessageType, OutboundMessage } from "../../message/outbound"
import { DfuseClientError } from "../../types/error"

const message1: OutboundMessage<any> = {
  type: OutboundMessageType.GET_HEAD_INFO,
  req_id: "1",
  data: {}
}

const message2: OutboundMessage<any> = {
  type: OutboundMessageType.GET_HEAD_INFO,
  req_id: "2",
  data: {}
}

describe("StreamClient", () => {
  let socket: MockSocket
  let client: StreamClient

  beforeEach(() => {
    socket = new MockSocket()
    socket.connectMock.mockReturnValue(Promise.resolve())
    socket.disconnectMock.mockReturnValue(Promise.resolve())
    socket.sendMock.mockReturnValue(Promise.resolve(true))

    client = createStreamClient("any", {
      socket
    })
  })

  it("calls socket send with message when registering stream", async () => {
    await client.registerStream(message1, jest.fn())

    expect(socket.sendMock).toHaveBeenCalledTimes(1)
    expect(socket.sendMock).toHaveBeenCalledWith(message1)
  })

  it("does not allow to stream to register with same id", async () => {
    await client.registerStream(message1, jest.fn())

    try {
      await client.registerStream(message1, jest.fn())
      fail("Should failed due to same req_id being used while one still active")
    } catch (error) {
      expect(error).toEqual(
        new DfuseClientError(
          "A stream with id '1' is already registered, cannot register another one with the same id"
        )
      )
    }
  })

  it("allow to stream to register with previous id when not active anymore", async () => {
    const stream = await client.registerStream(message1, jest.fn())
    await stream.unlisten()

    // Just the fact that it did not throw is good enough here
    await client.registerStream(message1, jest.fn())
  })

  it("calls socket send with message when unregistering stream", async () => {
    await client.registerStream(message1, jest.fn())
    await client.unregisterStream(message1.req_id)

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, {
      data: { req_id: "1" },
      req_id: "1",
      type: "unlisten"
    })
  })

  it("calls socket send with message when unregistering stream via unlisten", async () => {
    const stream = await client.registerStream(message1, jest.fn())
    await stream.unlisten()

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, {
      data: { req_id: "1" },
      req_id: "1",
      type: "unlisten"
    })
  })

  it("does nothing when unregistering stream that does not exist", async () => {
    await client.unregisterStream("1")

    expect(socket.sendMock).toHaveBeenCalledTimes(0)
    expect(socket.disconnectMock).toHaveBeenCalledTimes(0)
  })

  it("calls socket connect when registering first stream", async () => {
    await client.registerStream(message1, jest.fn())

    expect(socket.connectMock).toHaveBeenCalledTimes(1)
  })

  it("does not call socket connect twice when registering with an existing stream active", async () => {
    await client.registerStream(message1, jest.fn())
    await client.registerStream(message2, jest.fn())

    expect(socket.connectMock).toHaveBeenCalledTimes(1)
  })

  it("call socket connect after a full register/unregister cycle", async () => {
    const stream = await client.registerStream(message1, jest.fn())
    await stream.unlisten()

    await client.registerStream(message2, jest.fn())

    expect(socket.connectMock).toHaveBeenCalledTimes(2)
  })

  it("does not call socket connect after a full register/unregister cycle with one still active", async () => {
    await client.registerStream(message1, jest.fn())
    const stream2 = await client.registerStream(message2, jest.fn())
    await stream2.unlisten()

    await client.registerStream(message2, jest.fn())

    expect(socket.connectMock).toHaveBeenCalledTimes(1)
  })

  it("calls disconnect when no more stream present", async () => {
    await client.registerStream(message1, jest.fn())
    await client.unregisterStream(message1.req_id)

    expect(socket.disconnectMock).toHaveBeenCalledTimes(1)
  })

  it("calls disconnect when no more stream present via unlisten", async () => {
    const stream = await client.registerStream(message1, jest.fn())
    await stream.unlisten()

    expect(socket.disconnectMock).toHaveBeenCalledTimes(1)
  })

  it("does not call disconnect after a full register/unregister cycle with one still active", async () => {
    await client.registerStream(message1, jest.fn())
    const stream2 = await client.registerStream(message2, jest.fn())
    await stream2.unlisten()

    await client.registerStream(message2, jest.fn())

    expect(socket.disconnectMock).toHaveBeenCalledTimes(0)
  })

  it("forwards message to right registered stream when there is a single one", async () => {
    let sendMessage: (message: InboundMessage<any>) => void
    const receiveMessage = jest.fn<InboundMessage<any>>()

    socket.connectMock.mockImplementation((handler) => {
      sendMessage = handler
      return Promise.resolve()
    })

    await client.registerStream(message1, receiveMessage)

    // @ts-ignore
    const mustSendMessage = sendMessage
    const message = { type: InboundMessageType.PING, req_id: message1.req_id, data: {} }

    mustSendMessage(message)
    expect(receiveMessage).toHaveBeenCalledTimes(1)
    expect(receiveMessage).toHaveBeenCalledWith(message)
  })

  it("forwards message to right registered stream when there is multiples", async () => {
    let sendMessage: (message: InboundMessage<any>) => void
    const receiveMessage1 = jest.fn<InboundMessage<any>>()
    const receiveMessage2 = jest.fn<InboundMessage<any>>()

    socket.connectMock.mockImplementation((handler) => {
      sendMessage = handler
      return Promise.resolve()
    })

    await client.registerStream(message1, receiveMessage1)
    await client.registerStream(message2, receiveMessage2)

    // @ts-ignore
    const mustSendMessage = sendMessage
    const sentMessage1 = {
      type: InboundMessageType.PING,
      req_id: message1.req_id,
      data: { field: 1 }
    }

    const sentMessage2 = {
      type: InboundMessageType.PING,
      req_id: message2.req_id,
      data: { field: 2 }
    }

    mustSendMessage(sentMessage1)
    mustSendMessage(sentMessage2)

    expect(receiveMessage1).toHaveBeenCalledTimes(1)
    expect(receiveMessage1).toHaveBeenCalledWith(sentMessage1)

    expect(receiveMessage2).toHaveBeenCalledTimes(1)
    expect(receiveMessage2).toHaveBeenCalledWith(sentMessage2)
  })

  it("ignores message when no registered stream", async () => {
    let sendMessage: (message: InboundMessage<any>) => void
    const receiveMessage = jest.fn<InboundMessage<any>>()

    socket.connectMock.mockImplementation((handler) => {
      sendMessage = handler
      return Promise.resolve()
    })

    await client.registerStream(message1, receiveMessage)

    // @ts-ignore
    const mustSendMessage = sendMessage
    const message = { type: InboundMessageType.PING, req_id: message1.req_id, data: {} }

    mustSendMessage(message)
    expect(receiveMessage).toHaveBeenCalledTimes(1)
    expect(receiveMessage).toHaveBeenCalledWith(message)
  })

  it("ignores message when no registered stream exists for id", async () => {
    let sendMessage: (message: InboundMessage<any>) => void
    const receiveMessage = jest.fn<InboundMessage<any>>()

    socket.connectMock.mockImplementation((handler) => {
      sendMessage = handler
      return Promise.resolve()
    })

    await client.registerStream(message1, receiveMessage)

    // @ts-ignore
    const mustSendMessage = sendMessage
    const message = { type: InboundMessageType.PING, req_id: "random_id", data: {} }

    mustSendMessage(message)
    expect(receiveMessage).toHaveBeenCalledTimes(0)
  })

  it("forwards set api token call to socket", async () => {
    client.setApiToken("new token")

    expect(socket.setApiTokenMock).toHaveBeenCalledTimes(1)
    expect(socket.setApiTokenMock).toHaveBeenCalledWith("new token")
  })
})
