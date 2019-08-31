import { mock, MockSocket, createSocketController, SocketController } from "./mocks"
import { DfuseClientError } from "../../types/error"
import { GraphqlStreamClient, OnGraphqlStreamMessage } from "../../types/graphql-stream-client"
import { createGraphqlStreamClient } from "../graphql-stream-client"
import { GraphqlOutboundMessage } from "../../types/graphql"

const document1 = "{ doc1 }"
const document2 = "{ doc2 }"

const document1Start = {
  id: "1",
  payload: { query: "{ doc1 }", variables: undefined },
  type: "start"
}

describe("GraphqlStreamClient", () => {
  let socket: MockSocket
  let socketController: SocketController
  let client: GraphqlStreamClient

  beforeEach(() => {
    socket = new MockSocket()
    socket.sendMock.mockReturnValue(Promise.resolve())

    socketController = createSocketController(socket)

    socketController.setDisconnected()
    socketController.replier((outboundMessage: GraphqlOutboundMessage) => {
      if (outboundMessage.type === "connection_init") {
        return { type: "connection_ack" }
      }

      return undefined
    })

    client = createGraphqlStreamClient("any", {
      socket
    })
    client.setApiToken("123")
  })

  it("calls socket correctly initialize connection when registering stream", async () => {
    await client.registerStream("1", document1, undefined, jest.fn())

    expect(socket.connectMock).toHaveBeenCalledTimes(1)

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(1, {
      type: "connection_init",
      payload: { Authorization: "123" }
    })
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, document1Start)
  })

  it("client correctly handle connection_error when registering stream", async () => {
    socketController.replier(() => {
      return { type: "connection_error", payload: "forced error" }
    })

    await expect(client.registerStream("1", document1, undefined, jest.fn())).rejects.toEqual(
      "forced error"
    )

    expect(socket.connectMock).toHaveBeenCalledTimes(1)
    expect(socket.disconnectMock).toHaveBeenCalledTimes(1)
    expect(socket.isConnected).toBeFalsy()
  })

  it("does not allow to stream to register with same id", async () => {
    await client.registerStream("1", document1, undefined, jest.fn())

    try {
      await client.registerStream("1", document1, undefined, jest.fn())
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
    const stream = await client.registerStream("1", document1, undefined, jest.fn())
    await stream.close()

    // Just the fact that it did not throw is good enough here
    await client.registerStream("1", document1, undefined, jest.fn())
  })

  it("calls socket send with message when unregistering stream", async () => {
    await client.registerStream("1", document1, undefined, jest.fn())
    await client.unregisterStream("1")

    expect(socket.sendMock).toHaveBeenCalledTimes(3)
    expect(socket.sendMock).toHaveBeenNthCalledWith(3, {
      id: "1",
      type: "stop"
    })
  })

  it("calls socket send with message when unregistering stream via close", async () => {
    const stream = await client.registerStream("1", document1, undefined, jest.fn())
    await stream.close()

    expect(socket.sendMock).toHaveBeenCalledTimes(3)
    expect(socket.sendMock).toHaveBeenNthCalledWith(3, {
      id: "1",
      type: "stop"
    })
  })

  it("does nothing when unregistering stream that does not exist", async () => {
    await client.unregisterStream("1")

    expect(socket.sendMock).toHaveBeenCalledTimes(0)
    expect(socket.disconnectMock).toHaveBeenCalledTimes(0)
  })

  it("does not call socket connect twice when registering with an existing stream active", async () => {
    await client.registerStream("1", document1, undefined, jest.fn())
    await client.registerStream("2", document2, undefined, jest.fn())

    expect(socket.connectMock).toHaveBeenCalledTimes(1)
  })

  it("call socket connect after a full register/unregister cycle", async () => {
    const stream = await client.registerStream("1", document1, undefined, jest.fn())
    await stream.close()

    await client.registerStream("2", document2, undefined, jest.fn())

    expect(socket.connectMock).toHaveBeenCalledTimes(2)
  })

  it("does not call socket connect after a full register/unregister cycle with one still active", async () => {
    await client.registerStream("1", document1, undefined, jest.fn())
    const stream2 = await client.registerStream("2", document2, undefined, jest.fn())
    await stream2.close()

    await client.registerStream("2", document2, undefined, jest.fn())

    expect(socket.connectMock).toHaveBeenCalledTimes(1)
  })

  it("calls disconnect when no more stream present", async () => {
    await client.registerStream("1", document1, undefined, jest.fn())
    await client.unregisterStream("1")

    expect(socket.disconnectMock).toHaveBeenCalledTimes(1)
  })

  it("calls disconnect when no more stream present via close", async () => {
    const stream = await client.registerStream("1", document1, undefined, jest.fn())
    await stream.close()

    expect(socket.disconnectMock).toHaveBeenCalledTimes(1)
  })

  it("does not call disconnect after a full register/unregister cycle with one still active", async () => {
    await client.registerStream("1", document1, undefined, jest.fn())
    const stream2 = await client.registerStream("2", document2, undefined, jest.fn())
    await stream2.close()

    await client.registerStream("2", document2, undefined, jest.fn())

    expect(socket.disconnectMock).toHaveBeenCalledTimes(0)
  })

  it("forwards data message to right registered stream when there is a single one", async () => {
    const streamOnMessage = mock<OnGraphqlStreamMessage>()
    await client.registerStream("1", document1, undefined, streamOnMessage)

    socketController.send({ type: "data", id: "1", payload: {} })

    expect(streamOnMessage).toHaveBeenCalledTimes(1)
    expect(streamOnMessage).toHaveBeenCalledWith({ type: "data", data: undefined })
  })

  it("forwards data errors message to right registered stream when there is a single one", async () => {
    const streamOnMessage = mock<OnGraphqlStreamMessage>()
    await client.registerStream("1", document1, undefined, streamOnMessage)

    socketController.send({
      type: "data",
      id: "1",
      payload: { errors: ["first error", "second error"] }
    })

    expect(streamOnMessage).toHaveBeenCalledTimes(1)
    expect(streamOnMessage).toHaveBeenCalledWith({
      type: "error",
      errors: ["first error", "second error"]
    })
  })

  it("forwards error message to right registered stream when there is a single one", async () => {
    const streamOnMessage = mock<OnGraphqlStreamMessage>()
    await client.registerStream("1", document1, undefined, streamOnMessage)

    socketController.send({
      type: "error",
      id: "1",
      payload: "an error"
    })

    expect(streamOnMessage).toHaveBeenCalledTimes(1)
    expect(streamOnMessage).toHaveBeenCalledWith({
      type: "error",
      errors: ["an error"]
    })
  })

  it("forwards complete message to right registered stream when there is a single one", async () => {
    const streamOnMessage = mock<OnGraphqlStreamMessage>()
    await client.registerStream("1", document1, undefined, streamOnMessage)

    socketController.send({
      type: "complete",
      id: "1"
    })

    expect(streamOnMessage).toHaveBeenCalledTimes(1)
    expect(streamOnMessage).toHaveBeenCalledWith({
      type: "complete"
    })
  })

  it("forwards message to right registered stream when there is multiples", async () => {
    const streamOnMessage1 = mock<OnGraphqlStreamMessage>()
    const streamOnMessage2 = mock<OnGraphqlStreamMessage>()

    await client.registerStream("1", document1, undefined, streamOnMessage1)
    await client.registerStream("2", document2, undefined, streamOnMessage2)

    socketController.send({ type: "data", id: "1", payload: { data: "1" } })
    socketController.send({ type: "data", id: "2", payload: { data: "2" } })

    expect(streamOnMessage1).toHaveBeenCalledTimes(1)
    expect(streamOnMessage1).toHaveBeenCalledWith({ type: "data", data: "1" })

    expect(streamOnMessage2).toHaveBeenCalledTimes(1)
    expect(streamOnMessage2).toHaveBeenCalledWith({ type: "data", data: "2" })
  })

  it("ignores message when no registered stream exists for id", async () => {
    const streamOnMessage = mock<OnGraphqlStreamMessage>()
    await client.registerStream("1", document1, undefined, streamOnMessage)

    socketController.send({ type: "data", id: "random_id1", payload: {} })
    expect(streamOnMessage).toHaveBeenCalledTimes(0)
  })

  it("stream closing does not send unlisten message when socket not connected", async () => {
    const stream = await client.registerStream("1", document1, undefined, jest.fn())

    socketController.setDisconnected()
    stream.close()

    expect(socket.sendMock).toHaveBeenCalledTimes(2)
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, document1Start)
  })

  it("automatically restarts stream by default on reconnection", async () => {
    const streamOnMessage = mock<OnGraphqlStreamMessage>()
    const stream = await client.registerStream("1", document1, undefined, streamOnMessage)

    socketController.notifyReconnection()

    await new Promise((resolve) => {
      stream.onPostRestart = resolve
    })

    expect(socket.sendMock).toHaveBeenCalledTimes(4)
    expect(socket.sendMock).toHaveBeenNthCalledWith(1, {
      type: "connection_init",
      payload: { Authorization: "123" }
    })
    expect(socket.sendMock).toHaveBeenNthCalledWith(2, document1Start)

    expect(socket.sendMock).toHaveBeenNthCalledWith(3, {
      type: "connection_init",
      payload: { Authorization: "123" }
    })
    expect(socket.sendMock).toHaveBeenNthCalledWith(4, document1Start)
  })

  it("manual restart possible when auto restart is off", async () => {
    client = createGraphqlStreamClient("any", {
      socket,
      autoRestartStreamsOnReconnect: false
    })

    const streamOnMessage = mock<OnGraphqlStreamMessage>()
    const stream = await client.registerStream("1", document1, undefined, streamOnMessage)

    // Assume there was a reconnect at this point
    await stream.restart()

    expect(socket.sendMock).toHaveBeenCalledTimes(3)
    expect(socket.sendMock).toHaveBeenNthCalledWith(3, document1Start)
  })

  it("change cursor when restart marker is used to restart", async () => {
    client = createGraphqlStreamClient("any", {
      socket,
      autoRestartStreamsOnReconnect: false
    })

    const streamOnMessage = mock<OnGraphqlStreamMessage>()
    const stream = await client.registerStream("1", document1, undefined, streamOnMessage)

    // Assume there was a reconnect at this point
    await stream.restart({ cursor: "abc" })

    expect(socket.sendMock).toHaveBeenCalledTimes(3)
    expect(socket.sendMock).toHaveBeenNthCalledWith(3, {
      id: "1",
      type: "start",
      payload: {
        query: "{ doc1 }",
        variables: {
          cursor: "abc"
        }
      }
    })
  })

  it("restart marker takes precedence over mark when set for start_block upon restart", async () => {
    const streamOnMessage = mock<OnGraphqlStreamMessage>()
    const stream = await client.registerStream("1", document1, undefined, streamOnMessage)
    stream.mark({ cursor: "abc" })

    // Assume there was a reconnect at this point
    await stream.restart({ cursor: "def" })

    expect(socket.sendMock).toHaveBeenCalledTimes(3)
    expect(socket.sendMock).toHaveBeenNthCalledWith(3, {
      id: "1",
      type: "start",
      payload: {
        query: "{ doc1 }",
        variables: {
          cursor: "def"
        }
      }
    })
  })

  it("change start_block when mark was used on stream prior restart", async () => {
    const streamOnMessage = jest.fn()
    const stream = await client.registerStream("1", document1, undefined, streamOnMessage)

    stream.mark({ cursor: "abc" })

    // Assume there was a reconnect at this point
    await stream.restart()

    expect(socket.sendMock).toHaveBeenCalledTimes(3)
    expect(socket.sendMock).toHaveBeenNthCalledWith(3, {
      id: "1",
      type: "start",
      payload: {
        query: "{ doc1 }",
        variables: {
          cursor: "abc"
        }
      }
    })
  })

  it("stream mark on stream client only accept correct atBlockNum marker", async () => {
    const streamOnMessage = mock<OnGraphqlStreamMessage>()
    const stream = await client.registerStream("1", document1, undefined, streamOnMessage)

    const expectedError = new DfuseClientError(
      "Only non-empty `cursor` markers are accepted for this operation"
    )

    expect(() => {
      stream.mark({ atBlockNum: 0 })
    }).toThrowError(expectedError)

    expect(() => {
      stream.mark({ atBlockNum: 0, cursor: "" })
    }).toThrowError(expectedError)

    expect(() => {
      stream.mark({ cursor: "" })
    }).toThrowError(expectedError)
  })

  it("restart marker on stream client only accept correct atBlockNum marker", async () => {
    const streamOnMessage = mock<OnGraphqlStreamMessage>()
    const stream = await client.registerStream("1", document1, undefined, streamOnMessage)

    const expectedError = new DfuseClientError(
      "Only non-empty `cursor` markers are accepted for this operation"
    )

    expect(stream.restart({ atBlockNum: 0 })).rejects.toThrowError(expectedError)
    expect(stream.restart({ atBlockNum: -0, cursor: "" })).rejects.toThrowError(expectedError)
    expect(stream.restart({ cursor: "" })).rejects.toThrowError(expectedError)
  })

  it("throws when trying to restart a stream that was closed", async () => {
    const stream = await client.registerStream("1", document1, undefined, jest.fn())
    await stream.close()

    // Assume there was a reconnect at this point

    await expect(stream.restart()).rejects.toThrowError(
      new DfuseClientError(
        "Trying to restart a stream '1' that is not registered anymore or was never registered"
      )
    )
  })

  it("reception of a complete message does correctly terminate it", async () => {
    const streamOnMessage = jest.fn()
    const stream = await client.registerStream("1", document1, undefined, streamOnMessage)

    socketController.send({ id: "1", type: "complete" })

    await stream.join()

    expect(socket.sendMock).toHaveBeenCalledTimes(3)
    expect(socket.sendMock).toHaveBeenNthCalledWith(3, {
      id: "1",
      type: "stop"
    })

    expect(socket.isConnected).toBeFalsy()
  })

  it("reception of an error message does correctly terminate it", async () => {
    const streamOnMessage = jest.fn()
    const stream = await client.registerStream("1", document1, undefined, streamOnMessage)

    socketController.send({ id: "1", type: "error", payload: { error: "error1" } })

    await expect(stream.join()).rejects.toEqual({ error: "error1" })

    expect(socket.sendMock).toHaveBeenCalledTimes(3)
    expect(socket.sendMock).toHaveBeenNthCalledWith(3, {
      id: "1",
      type: "stop"
    })

    expect(socket.isConnected).toBeFalsy()
  })
})
