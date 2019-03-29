import { InboundMessageType, InboundMessage } from "../../message/inbound"
import { createStreamClient } from "../stream-client"
import { StreamClient } from "../../types/stream-client"
import { MockSocket } from "./mocks"
import { OutboundMessageType, OutboundMessage } from "../../message/outbound"
import { DfuseClientError } from "../../types/error"

const message1: OutboundMessage = {
  type: OutboundMessageType.GET_HEAD_INFO,
  req_id: "1",
  data: {}
}

const message2: OutboundMessage = {
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
    await stream.close()

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

  it("calls socket send with message when unregistering stream via close", async () => {
    const stream = await client.registerStream(message1, jest.fn())
    await stream.close()

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
    await stream.close()

    await client.registerStream(message2, jest.fn())

    expect(socket.connectMock).toHaveBeenCalledTimes(2)
  })

  it("does not call socket connect after a full register/unregister cycle with one still active", async () => {
    await client.registerStream(message1, jest.fn())
    const stream2 = await client.registerStream(message2, jest.fn())
    await stream2.close()

    await client.registerStream(message2, jest.fn())

    expect(socket.connectMock).toHaveBeenCalledTimes(1)
  })

  it("calls disconnect when no more stream present", async () => {
    await client.registerStream(message1, jest.fn())
    await client.unregisterStream(message1.req_id)

    expect(socket.disconnectMock).toHaveBeenCalledTimes(1)
  })

  it("calls disconnect when no more stream present via close", async () => {
    const stream = await client.registerStream(message1, jest.fn())
    await stream.close()

    expect(socket.disconnectMock).toHaveBeenCalledTimes(1)
  })

  it("does not call disconnect after a full register/unregister cycle with one still active", async () => {
    await client.registerStream(message1, jest.fn())
    const stream2 = await client.registerStream(message2, jest.fn())
    await stream2.close()

    await client.registerStream(message2, jest.fn())

    expect(socket.disconnectMock).toHaveBeenCalledTimes(0)
  })

  it("forwards message to right registered stream when there is a single one", async () => {
    let sendMessage: (message: InboundMessage) => void
    const streamOnMessage = jest.fn<InboundMessage>()

    socket.connectMock.mockImplementation((handler) => {
      sendMessage = handler
      return Promise.resolve()
    })

    await client.registerStream(message1, streamOnMessage)

    // @ts-ignore
    const mustSendMessage = sendMessage
    const message = { type: InboundMessageType.PING, req_id: message1.req_id, data: {} }

    mustSendMessage(message)
    expect(streamOnMessage).toHaveBeenCalledTimes(1)
    expect(streamOnMessage).toHaveBeenCalledWith(message)
  })

  it("forwards message to right registered stream when there is multiples", async () => {
    let sendMessage: (message: InboundMessage) => void
    const streamOnMessage1 = jest.fn<InboundMessage>()
    const streamOnMessage2 = jest.fn<InboundMessage>()

    socket.connectMock.mockImplementation((handler) => {
      sendMessage = handler
      return Promise.resolve()
    })

    await client.registerStream(message1, streamOnMessage1)
    await client.registerStream(message2, streamOnMessage2)

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

    expect(streamOnMessage1).toHaveBeenCalledTimes(1)
    expect(streamOnMessage1).toHaveBeenCalledWith(sentMessage1)

    expect(streamOnMessage2).toHaveBeenCalledTimes(1)
    expect(streamOnMessage2).toHaveBeenCalledWith(sentMessage2)
  })

  it("ignores message when no registered stream", async () => {
    let sendMessage: (message: InboundMessage) => void
    const streamOnMessage = jest.fn<InboundMessage>()

    socket.connectMock.mockImplementation((handler) => {
      sendMessage = handler
      return Promise.resolve()
    })

    await client.registerStream(message1, streamOnMessage)

    // @ts-ignore
    const mustSendMessage = sendMessage
    const message = { type: InboundMessageType.PING, req_id: message1.req_id, data: {} }

    mustSendMessage(message)
    expect(streamOnMessage).toHaveBeenCalledTimes(1)
    expect(streamOnMessage).toHaveBeenCalledWith(message)
  })

  it("ignores message when no registered stream exists for id", async () => {
    let sendMessage: (message: InboundMessage) => void
    const streamOnMessage = jest.fn<InboundMessage>()

    socket.connectMock.mockImplementation((handler) => {
      sendMessage = handler
      return Promise.resolve()
    })

    await client.registerStream(message1, streamOnMessage)

    // @ts-ignore
    const mustSendMessage = sendMessage
    const message = { type: InboundMessageType.PING, req_id: "random_id", data: {} }

    mustSendMessage(message)
    expect(streamOnMessage).toHaveBeenCalledTimes(0)
  })

  it("stream closing does not send unlisten message when socket not connected", async () => {
    const stream = await client.registerStream(message1, jest.fn())

    socket.isConnectedMock.mockReturnValue(false)
    stream.close()

    expect(socket.sendMock).toHaveBeenCalledTimes(1)
    expect(socket.sendMock).toHaveBeenCalledWith(message1)
  })

  it("automatically restarts stream by default on reconnection", async () => {
    let notifyOnReconnect: (message: InboundMessage) => void
    const streamOnMessage = jest.fn<InboundMessage>()

    socket.connectMock.mockImplementation((_, options) => {
      notifyOnReconnect = options.onReconnect
      return Promise.resolve()
    })

    await client.registerStream(message1, streamOnMessage)

    // @ts-ignore Will have been set by the time we reach this execution point
    notifyOnReconnect()

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, message1)
  })

  it("manual restart possible when auto restart is off", async () => {
    client = createStreamClient("any", {
      socket,
      autoRestartStreamsOnReconnect: false
    })

    let notifyOnReconnect: (message: InboundMessage) => void
    const streamOnMessage = jest.fn<InboundMessage>()

    socket.connectMock.mockImplementation((_, options) => {
      notifyOnReconnect = options.onReconnect
      return Promise.resolve()
    })

    const stream = await client.registerStream(message1, streamOnMessage)

    // @ts-ignore Will have been set by the time we reach this execution point
    notifyOnReconnect()

    expect(socket.sendMock).toHaveBeenCalledTimes(1)

    await stream.restart()
    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, message1)
  })

  it("change start_block when restart marker is used to restart", async () => {
    const streamOnMessage = jest.fn<InboundMessage>()

    const stream = await client.registerStream(message1, streamOnMessage)

    // Assume there was a reconnect at this point
    stream.restart({ atBlockNum: 10 })

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, {
      data: {},
      req_id: "1",
      type: "get_head_info",
      start_block: 10
    })
  })

  it("restart marker takes precedence over mark when set for start_block upon restart", async () => {
    const streamOnMessage = jest.fn<InboundMessage>()
    const stream = await client.registerStream(message1, streamOnMessage)

    stream.mark({ atBlockNum: 100 })

    // Assume there was a reconnect at this point
    stream.restart({ atBlockNum: 50 })

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, {
      data: {},
      req_id: "1",
      type: "get_head_info",
      start_block: 50
    })
  })

  it("change start_block when mark was used on stream prior restart", async () => {
    const streamOnMessage = jest.fn<InboundMessage>()

    const stream = await client.registerStream(message1, streamOnMessage)

    stream.mark({ atBlockNum: 100 })

    // Assume there was a reconnect at this point
    stream.restart()

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, {
      data: {},
      req_id: "1",
      type: "get_head_info",
      start_block: 100
    })
  })

  it("throws when trying to restart a stream that was closed", async () => {
    const stream = await client.registerStream(message1, jest.fn())
    await stream.close()

    // Assume there was a reconnect at this point

    await expect(stream.restart()).rejects.toThrowError(
      new DfuseClientError(
        "Trying to restart a stream '1' that is not registered anymore or was never registered"
      )
    )
  })
})
