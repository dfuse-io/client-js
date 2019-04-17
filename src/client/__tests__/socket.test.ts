import { createSocket } from "../socket"
import { InboundMessage, InboundMessageType } from "../../message/inbound"
import { getActionTracesMessage } from "../../message/outbound"
import { WebSocketFactory } from "../../types/socket"
import { CLOSED } from "ws"
import { MockSocket, MockWebSocket } from "./mocks"
import { doesNotReject } from "assert"

describe("socket", () => {
  let mockWebSocket: MockWebSocket
  let receivedMessages: InboundMessage[]
  const noopListener = () => null
  const accumulatingListener = (message: InboundMessage) => {
    receivedMessages.push(message)
  }

  beforeEach(() => {
    mockWebSocket = new MockWebSocket("any")
    receivedMessages = []
  })

  afterEach(() => {
    cleanupConnection(mockWebSocket)
  })

  it("starts disconnected by default", () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    expect(socket.isConnected).toBeFalsy()
  })

  it("configures handlers on connect", () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    socket.connect(noopListener).then(() => {
      expect(mockWebSocket.onclose).toBeDefined()
      expect(mockWebSocket.onerror).toBeDefined()
      expect(mockWebSocket.onopen).toBeDefined()
    })
  })

  it("switch to connected on successful connect", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => openConnection(mockWebSocket), 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    expect(socket.isConnected).toBeTruthy()
  })

  it("calling connect twice without actual connections", async () => {
    let callCount = 0

    const socket = createSocket("any", {
      webSocketFactory: async () => {
        callCount++
        return Promise.resolve(mockWebSocket)
      }
    })

    expect.hasAssertions()
    const promise1 = socket.connect(noopListener)
    const promise2 = socket.connect(noopListener)

    expect(callCount).toEqual(1)
    expect(promise2).toEqual(promise1)

    // Let both connect a chance to complete there work
    await waitFor(10)
  })

  it("handles connection error properly", async () => {
    const socket = createSocket("any", {
      webSocketFactory: async () => {
        return Promise.resolve(mockWebSocket)
      }
    })

    setTimeout(() => rejectConnection(mockWebSocket, { reason: "test" }), 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).rejects.toEqual({ reason: "test" })

    expect(socket.isConnected).toBeFalsy()
  })

  it("notifies onReconnect when reconnection", async () => {
    const constructorOnReconnect = jest.fn()
    const connectOnReconnect = jest.fn()

    const socket = createSocket("any", {
      reconnectDelayInMs: 0,
      onReconnect: constructorOnReconnect,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
      closeConnection(mockWebSocket, { code: 1001 })
    }, 0)

    expect.hasAssertions()
    await expect(
      socket.connect(noopListener, { onReconnect: connectOnReconnect })
    ).resolves.toBeUndefined()

    await waitForReconnectionToTrigger()
    reopenConnection(mockWebSocket)

    expect(constructorOnReconnect).toHaveBeenCalledTimes(1)
    expect(constructorOnReconnect).toHaveBeenCalledWith()

    expect(connectOnReconnect).toHaveBeenCalledTimes(1)
    expect(connectOnReconnect).toHaveBeenCalledWith()
  })

  it("notifies onError when error occurred on connect", async () => {
    const onError = jest.fn()
    const socket = createSocket("any", {
      onError,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      rejectConnection(mockWebSocket, "something")
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).rejects.toEqual("something")
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith("something")
  })

  it("notifies onClose even when error occurs", async () => {
    const onError = jest.fn()
    const onClose = jest.fn()
    const socket = createSocket("any", {
      onError,
      onClose,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      rejectConnection(mockWebSocket, "something")
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).rejects.toEqual("something")
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith("something")

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledWith("something")
  })

  it("notifies onError when error occurred after succesfull connection", async () => {
    const onError = jest.fn()
    const socket = createSocket("any", {
      onError,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
      rejectConnection(mockWebSocket, "something")
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith("something")
  })

  it("reconnects on abnormal close code ", async () => {
    const socket = createSocket("any", {
      reconnectDelayInMs: 0,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
      closeConnection(mockWebSocket, { code: 1001 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    await waitForReconnectionToTrigger()
    reopenConnection(mockWebSocket)

    expect(socket.isConnected).toBeTruthy()
  })

  it("reconnects on abnormal close code even with other custom stream options ", async () => {
    const onError = jest.fn()
    const socket = createSocket("any", {
      reconnectDelayInMs: 0,
      onError,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
      closeConnection(mockWebSocket, { code: 1001 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    await waitForReconnectionToTrigger()
    reopenConnection(mockWebSocket)

    expect(socket.isConnected).toBeTruthy()
  })

  it("doesn't try to reconnect on close code 1000 (normal closure)", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
      closeConnection(mockWebSocket, { code: 1000 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    reopenConnection(mockWebSocket)

    expect(socket.isConnected).toBeFalsy()
  })

  it("doesn't try to reconnect on close code 1005 (no status code present)", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
      closeConnection(mockWebSocket, { code: 1005 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    reopenConnection(mockWebSocket)

    expect(socket.isConnected).toBeFalsy()
  })

  it("doesn't try to reconnect when autoReconnect is false", async () => {
    const socket = createSocket("any", {
      autoReconnect: false,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
      closeConnection(mockWebSocket, { code: 1001 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    reopenConnection(mockWebSocket)

    expect(socket.isConnected).toBeFalsy()
  })

  it("calling disconnect is idempotent when current disconnect in progress", async (done) => {
    const onClose = (event: any) => {
      expect(event).toEqual("something")
      done()
    }

    const socket = createSocket("any", {
      onClose,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket, { code: 1000 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    socket.disconnect()
    socket.disconnect()

    expect(mockWebSocket.closeMock).toHaveBeenCalledTimes(1)

    closeConnection(mockWebSocket, "something")
  })

  it("notifies onClose even after disconnect has been called", async (done) => {
    const onError = jest.fn()
    const onClose = (event: any) => {
      expect(event).toEqual("something")
      done()
    }

    const socket = createSocket("any", {
      onError,
      onClose,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })
    setTimeout(() => {
      openConnection(mockWebSocket, { code: 1000 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    socket.disconnect()
    expect(mockWebSocket.closeMock).toHaveBeenCalledTimes(1)

    closeConnection(mockWebSocket, "something")
  })

  it("send message correctly when connected", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    setTimeout(() => {
      openConnection(mockWebSocket)
    }, 0)
    await socket.send(getActionTracesMessage({ accounts: "test" }, { req_id: "test" }))

    expect(mockWebSocket.sendMock).toHaveBeenCalledTimes(1)
  })

  it("send waits for connect before sending", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    expect.hasAssertions()

    // Called asynchronously
    socket.connect(noopListener)
    setTimeout(() => {
      openConnection(mockWebSocket)
    }, 0)

    await socket.send(getActionTracesMessage({ accounts: "test" }, { req_id: "test" }))
    expect(mockWebSocket.sendMock).toHaveBeenCalledTimes(1)
  })

  it("send correctly reconnects when not connected", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    await socket.send(
      getActionTracesMessage({ accounts: "test" }, { req_id: "test", listen: true })
    )

    expect(mockWebSocket.sendMock).toHaveBeenCalledTimes(1)
    expect(mockWebSocket.sendMock).toHaveBeenCalledWith(
      '{"type":"get_action_traces","req_id":"test","listen":true,"data":{"accounts":"test"}}'
    )
  })

  it("send pong message when keep alive sets to true", async () => {
    const socket = createSocket("any", {
      keepAlive: true,
      keepAliveIntervalInMs: 4,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })
    setTimeout(() => {
      openConnection(mockWebSocket)
    }, 0)

    expect.hasAssertions()

    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    await waitFor(5)

    // FIXME: This test is wacky, strangely, sometimes it's 1 pong others
    //        it's 2. It's not clear what's the cause, timing could be
    //        one but even having a good gap between keep alive and wait
    //        time does not help, `tried 10, 11` for example and sometimes
    //        there were still 2. 10 milliseconds should have elapsed to
    //        met the timing, so it feels unlikely that it's only timing
    const callCount = mockWebSocket.sendMock.mock.calls.length
    expect(callCount >= 1 && callCount <= 2).toBeTruthy()

    // Let's at least ensures we only get `pong` messages
    mockWebSocket.sendMock.mock.calls.forEach((call: any) => {
      expect(call[0]).toEqual('{"type":"pong"}')
    })
  })

  it("stop sending pong message when keep alive sets to true and disconnected", async () => {
    const socket = createSocket("any", {
      autoReconnect: false,
      keepAlive: true,
      keepAliveIntervalInMs: 4,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })
    setTimeout(() => {
      openConnection(mockWebSocket)
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    setTimeout(() => {
      closeConnection(mockWebSocket, { code: 1001 })
    }, 5)

    await waitFor(5)

    expect(mockWebSocket.sendMock).toHaveBeenCalledTimes(1)
    expect(mockWebSocket.sendMock).toHaveBeenCalledWith('{"type":"pong"}')
  })

  it("no pong messages when keep alive sets to false", async () => {
    const socket = createSocket("any", {
      keepAlive: false,
      keepAliveIntervalInMs: 1,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })
    setTimeout(() => {
      openConnection(mockWebSocket)
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    await waitFor(3)

    expect(mockWebSocket.sendMock).toHaveBeenCalledTimes(0)
  })

  it("forwards received message to listener", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(accumulatingListener)).resolves.toBeUndefined()
    sendMessageToConnection(mockWebSocket, { type: InboundMessageType.LISTENING, data: {} })

    expect(receivedMessages).toHaveLength(1)
    expect(receivedMessages[0]).toEqual({ type: InboundMessageType.LISTENING, data: {} })
  })

  it("notifies onInvalidMessage when message type is invalid", async () => {
    const onInvalidMessage = jest.fn()
    const socket = createSocket("any", {
      onInvalidMessage,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(accumulatingListener)).resolves.toBeUndefined()
    sendRawMessageToConnection(mockWebSocket, {
      data: JSON.stringify({ type: "something else" })
    })

    expect(onInvalidMessage).toHaveBeenCalledTimes(1)
    expect(onInvalidMessage).toHaveBeenCalledWith({ type: "something else" })
  })

  it("does not forward received message to listener when invalid type", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(accumulatingListener)).resolves.toBeUndefined()
    sendRawMessageToConnection(mockWebSocket, {
      data: JSON.stringify({ type: "something else" })
    })

    expect(receivedMessages).toHaveLength(0)
  })

  it("performs a single connect on multiple send calls without being connected yet", async () => {
    const onReconnect = jest.fn()
    const socket = createSocket("any", {
      onReconnect,
      webSocketFactory: createWebSocketFactory(mockWebSocket)
    })

    socket.connect(noopListener).then(() => {
      expect.hasAssertions()

      socket.send(getActionTracesMessage({ accounts: "test1" }, { req_id: "test1" }))
      socket.send(getActionTracesMessage({ accounts: "test2" }, { req_id: "test2" }))
      socket.send(getActionTracesMessage({ accounts: "test3" }, { req_id: "test3" }))

      openConnection(mockWebSocket)

      expect(onReconnect).toHaveBeenCalledTimes(0)
    })
  })

  const createHandlerExecutor = (handlerName: string) => {
    return (socket: MockWebSocket, ...args: any[]) => {
      const handler = (socket as any)[handlerName]
      if (handler) {
        return handler(...args)
      }

      throw new Error(`Cannot execute handler [${handlerName}] on mock socket, it does not exist.`)
    }
  }

  const openConnection = createHandlerExecutor("onopen")
  const reopenConnection = createHandlerExecutor("onopen")
  const closeConnection = createHandlerExecutor("onclose")
  const errorConnection = createHandlerExecutor("onerror")
  const sendRawMessageToConnection = createHandlerExecutor("onmessage")
  const sendMessageToConnection = (socket: MockWebSocket, message: InboundMessage) => {
    sendRawMessageToConnection(socket, { data: JSON.stringify(message) })
  }

  const rejectConnection = (socket: MockWebSocket, ...args: any) => {
    errorConnection(socket, ...args)
    closeConnection(socket, ...args)
  }

  const cleanupConnection = (socket: MockWebSocket) => {
    if (socket && socket.onclose) {
      return socket.onclose({
        code: 1000,
        reason: "test clean up",
        wasClean: true
      } as any)
    }
  }
})

function createWebSocketFactory(mockWebSocket: MockWebSocket) {
  return async () => {
    return Promise.resolve(mockWebSocket)
  }
}

async function waitForReconnectionToTrigger() {
  return await waitFor(2)
}

function waitFor(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
