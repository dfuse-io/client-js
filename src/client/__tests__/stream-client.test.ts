import { InboundMessageType, InboundMessage } from "../../message/inbound"
import { createStreamClient } from "../stream-client"
import { StreamClient } from "../../types/stream-client"
import { mock, MockSocket, createSocketController, SocketController } from "./mocks"
import { OutboundMessageType, OutboundMessage } from "../../message/outbound"
import { DfuseClientError } from "../../types/error"

const message1: OutboundMessage = {
  type: OutboundMessageType.GET_HEAD_INFO,
  req_id: "1",
  data: {},
}

const message2: OutboundMessage = {
  type: OutboundMessageType.GET_HEAD_INFO,
  req_id: "2",
  data: {},
}

describe("StreamClient", () => {
  let socket: MockSocket
  let socketController: SocketController
  let client: StreamClient

  beforeEach(() => {
    socket = new MockSocket()
    socket.sendMock.mockReturnValue(Promise.resolve())

    socketController = createSocketController(socket)
    socketController.setDisconnected()

    client = createStreamClient("any", {
      socket,
    })
  })

  it("calls socket send with message when registering stream", async () => {
    await client.registerStream(message1, jest.fn())

    expect(socket.sendMock).toHaveBeenCalledTimes(1)
    expect(socket.sendMock).toHaveBeenCalledWith(message1)
  })

  it("does not allow to stream to register with same id", async () => {
    await client.registerStream(message1, jest.fn())

    await expect(client.registerStream(message1, jest.fn())).rejects.toThrowError(
      new DfuseClientError(
        "A stream with id '1' is already registered, cannot register another one with the same id"
      )
    )
  })

  it("allow to stream to register with previous id when not active anymore", async () => {
    const stream = await client.registerStream(message1, jest.fn())
    await stream.close()

    // Just the fact that it did not throw is good enough here
    await expect(client.registerStream(message1, jest.fn())).resolves.toBeDefined()
  })

  it("calls socket send with message when unregistering stream", async () => {
    await client.registerStream(message1, jest.fn())
    await client.unregisterStream(message1.req_id)

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, {
      data: { req_id: "1" },
      req_id: "1",
      type: "unlisten",
    })
  })

  it("calls socket send with message when unregistering stream via close", async () => {
    const stream = await client.registerStream(message1, jest.fn())
    await stream.close()

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, {
      data: { req_id: "1" },
      req_id: "1",
      type: "unlisten",
    })
  })

  it("does nothing when unregistering stream that does not exist", async () => {
    await client.unregisterStream("1")

    expect(socket.sendMock).toHaveBeenCalledTimes(0)
    expect(socket.disconnectMock).toHaveBeenCalledTimes(0)
  })

  it("calls socket connect when registering and socket not connected", async () => {
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

  it("keeps socket alive when no more stream present via close but keep socket open sets to true", async () => {
    client = createStreamClient("any", {
      socket,
      autoDisconnectSocket: false,
    })

    const stream = await client.registerStream(message1, jest.fn())
    await stream.close()

    expect(socket.disconnectMock).toHaveBeenCalledTimes(0)
    expect(socket.isConnected).toBeTruthy()
  })

  it("does not call disconnect after a full register/unregister cycle with one still active", async () => {
    await client.registerStream(message1, jest.fn())
    const stream2 = await client.registerStream(message2, jest.fn())
    await stream2.close()

    await client.registerStream(message2, jest.fn())

    expect(socket.disconnectMock).toHaveBeenCalledTimes(0)
  })

  it("forwards message to right registered stream when there is a single one", async () => {
    const streamOnMessage = mock<InboundMessage>()
    const stream = await client.registerStream(message1, streamOnMessage)

    const message = { type: InboundMessageType.PROGRESS, req_id: message1.req_id, data: {} }

    socketController.send(message)
    expect(streamOnMessage).toHaveBeenCalledTimes(1)
    expect(streamOnMessage).toHaveBeenCalledWith(message, stream)
  })

  it("forwards message to right registered stream when there is multiples", async () => {
    const streamOnMessage1 = mock<InboundMessage>()
    const streamOnMessage2 = mock<InboundMessage>()

    const stream1 = await client.registerStream(message1, streamOnMessage1)
    const stream2 = await client.registerStream(message2, streamOnMessage2)

    // @ts-ignore
    const sentMessage1 = {
      type: InboundMessageType.PROGRESS,
      req_id: message1.req_id,
      data: { field: 1 },
    }

    const sentMessage2 = {
      type: InboundMessageType.PROGRESS,
      req_id: message2.req_id,
      data: { field: 2 },
    }

    socketController.send(sentMessage1)
    socketController.send(sentMessage2)

    expect(streamOnMessage1).toHaveBeenCalledTimes(1)
    expect(streamOnMessage1).toHaveBeenCalledWith(sentMessage1, stream1)

    expect(streamOnMessage2).toHaveBeenCalledTimes(1)
    expect(streamOnMessage2).toHaveBeenCalledWith(sentMessage2, stream2)
  })

  it("ignores message when no registered stream", async () => {
    const streamOnMessage = mock<InboundMessage>()
    const stream = await client.registerStream(message1, streamOnMessage)

    const message = { type: InboundMessageType.PROGRESS, req_id: message1.req_id, data: {} }

    socketController.send(message)
    expect(streamOnMessage).toHaveBeenCalledTimes(1)
    expect(streamOnMessage).toHaveBeenCalledWith(message, stream)
  })

  it("ignores message when no registered stream exists for id", async () => {
    const streamOnMessage = mock<InboundMessage>()
    await client.registerStream(message1, streamOnMessage)

    const message = { type: InboundMessageType.PROGRESS, req_id: "random_id", data: {} }

    socketController.send(message)
    expect(streamOnMessage).toHaveBeenCalledTimes(0)
  })

  it("stream closing does not send unlisten message when socket not connected", async () => {
    const stream = await client.registerStream(message1, jest.fn())

    socket.isConnectedMock.mockReturnValue(false)
    await stream.close()

    expect(socket.sendMock).toHaveBeenCalledTimes(1)
    expect(socket.sendMock).toHaveBeenCalledWith(message1)
  })

  it("automatically restarts stream by default on reconnection", async () => {
    const streamOnMessage = mock<InboundMessage>()
    await client.registerStream(message1, streamOnMessage)

    socketController.notifyReconnection()

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, message1)
  })

  it("manual restart possible when auto restart is off", async () => {
    client = createStreamClient("any", {
      socket,
      autoRestartStreamsOnReconnect: false,
    })

    const streamOnMessage = mock<InboundMessage>()
    const stream = await client.registerStream(message1, streamOnMessage)

    // Assume there was a reconnect at this point
    await stream.restart()

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, message1)
  })

  it("change start_block when restart marker is used to restart", async () => {
    const streamOnMessage = mock<InboundMessage>()
    const stream = await client.registerStream(message1, streamOnMessage)

    // Assume there was a reconnect at this point
    await stream.restart({ atBlockNum: 10 })

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, {
      data: {},
      req_id: "1",
      type: "get_head_info",
      start_block: 10,
    })
  })

  it("restart marker takes precedence over mark when set for start_block upon restart", async () => {
    const streamOnMessage = mock<InboundMessage>()
    const stream = await client.registerStream(message1, streamOnMessage)

    stream.mark({ atBlockNum: 100 })

    // Assume there was a reconnect at this point
    await stream.restart({ atBlockNum: 50 })

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, {
      data: {},
      req_id: "1",
      type: "get_head_info",
      start_block: 50,
    })
  })

  it("change start_block when mark was used on stream prior restart", async () => {
    const streamOnMessage = jest.fn()

    const stream = await client.registerStream(message1, streamOnMessage)

    stream.mark({ atBlockNum: 100 })

    // Assume there was a reconnect at this point
    await stream.restart()

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, {
      data: {},
      req_id: "1",
      type: "get_head_info",
      start_block: 100,
    })
  })

  it("stream mark on stream client only accept correct atBlockNum marker", async () => {
    const streamOnMessage = mock<InboundMessage>()
    const stream = await client.registerStream(message1, streamOnMessage)

    const expectedError = new DfuseClientError(
      "Only non-zero & positive `atBlockNum` markers are accepted for this operation"
    )

    expect(() => {
      stream.mark({ cursor: "" })
    }).toThrowError(expectedError)

    expect(() => {
      stream.mark({ atBlockNum: 0 })
    }).toThrowError(expectedError)

    expect(() => {
      stream.mark({ atBlockNum: -1 })
    }).toThrowError(expectedError)
  })

  it("restart marker on stream client only accept correct atBlockNum marker", async () => {
    const streamOnMessage = mock<InboundMessage>()
    const stream = await client.registerStream(message1, streamOnMessage)

    const expectedError = new DfuseClientError(
      "Only non-zero & positive `atBlockNum` markers are accepted for this operation"
    )

    await expect(stream.restart({ cursor: "" })).rejects.toThrowError(expectedError)
    await expect(stream.restart({ atBlockNum: 0 })).rejects.toThrowError(expectedError)
    await expect(stream.restart({ atBlockNum: -1 })).rejects.toThrowError(expectedError)
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
