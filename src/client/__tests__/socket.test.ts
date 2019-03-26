import { createEoswsSocket, EoswsSocket } from "../socket"
import { InboundMessage, InboundMessageType } from "../../message/inbound"
import { getActionTracesMessage } from "../../message/outbound"
import { ApiTokenStorage } from "../api-token-storage"

describe("socket", () => {
  let mockedWebSocket: ReturnType<typeof createSocketController>
  let factory: () => Promise<WebSocket>
  let receivedMessages: Array<InboundMessage<any>>
  const noopListener = () => null
  const accumulatingListener = (message: InboundMessage<any>) => {
    receivedMessages.push(message)
  }

  const storage = new ApiTokenStorage()
  storage.set({ token: "token", expires_at: 1234500 })

  beforeEach(() => {
    mockedWebSocket = createSocketController()
    factory = () => mockedWebSocket as any
    receivedMessages = []
  })

  afterEach(() => {
    cleanupConnection()
  })

  it("starts disconnected by default", () => {
    const socket = createEoswsSocket(factory)
    socket.setTokenStorage(storage)

    expect(socket.isConnected).toBeFalsy()
  })

  it("configures handlers on connect", () => {
    const socket = createEoswsSocket(factory)
    socket.setTokenStorage(storage)

    socket.connect(noopListener).then(() => {
      expect(mockedWebSocket.onclose).toBeDefined()
      expect(mockedWebSocket.onerror).toBeDefined()
      expect(mockedWebSocket.onopen).toBeDefined()
    })
  })

  it("switch to connected on successful connect", async () => {
    const socket = createEoswsSocket(factory)
    socket.setTokenStorage(storage)

    setTimeout(() => openConnection(), 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    expect(socket.isConnected).toBeTruthy()
  })

  it("handle 2 connections", async () => {
    const mockFactory = jest.fn().mockImplementation(factory)

    const socket = createEoswsSocket(mockFactory)
    socket.setTokenStorage(storage)

    expect.hasAssertions()
    socket.connect(noopListener)
    socket.connect(noopListener)
    expect(mockFactory).toHaveBeenCalledTimes(1)
  })

  it("handles connection error properly", async () => {
    const socket = createEoswsSocket(factory)
    socket.setTokenStorage(storage)

    setTimeout(() => rejectConnection({ reason: "test" }), 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).rejects.toEqual({ reason: "test" })
    expect(socket.isConnected).toBeFalsy()
  })

  it("notifies onReconnect when reconnection", async () => {
    const onReconnect = jest.fn()
    const socket = createEoswsSocket(factory, { reconnectDelayInMs: 0, onReconnect })
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
      closeConnection({ code: 1001 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    await waitForReconnectionToTrigger()
    reopenConnection()

    expect(onReconnect).toHaveBeenCalledTimes(1)
    expect(onReconnect).toHaveBeenCalledWith()
  })

  it("notifies onError when error occurred on connect", async () => {
    const onError = jest.fn()
    const socket = createEoswsSocket(factory, { onError })
    socket.setTokenStorage(storage)

    setTimeout(() => {
      rejectConnection("something")
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).rejects.toEqual("something")
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith("something")
  })

  it("notifies onClose even when error occurs", async () => {
    const onError = jest.fn()
    const onClose = jest.fn()
    const socket = createEoswsSocket(factory, { onError, onClose })
    setTimeout(() => {
      rejectConnection("something")
      closeConnection("something")
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
    const socket = createEoswsSocket(factory, { onError })
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
      rejectConnection("something")
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith("something")
  })

  it("reconnects on abnormal close code ", async () => {
    const socket = createEoswsSocket(factory, { reconnectDelayInMs: 0 })
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
      closeConnection({ code: 1001 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    await waitForReconnectionToTrigger()
    reopenConnection()

    expect(socket.isConnected).toBeTruthy()
  })

  it("reconnects on abnormal close code even with other custom stream options ", async () => {
    const onError = jest.fn()
    const socket = createEoswsSocket(factory, { reconnectDelayInMs: 0, onError })
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
      closeConnection({ code: 1001 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    await waitForReconnectionToTrigger()
    reopenConnection()

    expect(socket.isConnected).toBeTruthy()
  })

  it("doesn't try to reconnect on close code 1000 (normal closure)", async () => {
    const socket = createEoswsSocket(factory)
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
      closeConnection({ code: 1000 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    reopenConnection()

    expect(socket.isConnected).toBeFalsy()
  })

  it("doesn't try to reconnect on close code 1005 (no status code present)", async () => {
    const socket = createEoswsSocket(factory)
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
      closeConnection({ code: 1005 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    reopenConnection()

    expect(socket.isConnected).toBeFalsy()
  })

  it("doesn't try to reconnect when autoReconnect is false", async () => {
    const socket = createEoswsSocket(factory, { autoReconnect: false })
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
      closeConnection({ code: 1001 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    reopenConnection()

    expect(socket.isConnected).toBeFalsy()
  })

  it("notifies onClose even after disconnect has been called", async (done) => {
    const onError = jest.fn()
    const onClose = (event: any) => {
      expect(event).toEqual("something")
      done()
    }

    const socket = createEoswsSocket(factory, { onError, onClose })
    setTimeout(() => {
      openConnection({ code: 1000 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    socket.disconnect()

    expect(mockedWebSocket.close).toHaveBeenCalledTimes(1)
    closeConnection("something")
  })

  it("send message correctly when connected", async () => {
    const socket = createEoswsSocket(factory)
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    setTimeout(() => {
      openConnection()
    }, 0)
    await socket.send(getActionTracesMessage({ account: "test" }))

    expect(mockedWebSocket.send).toHaveBeenCalledTimes(1)
  })

  it("send waits for connect before sending", async () => {
    const socket = createEoswsSocket(factory)
    socket.setTokenStorage(storage)

    expect.hasAssertions()

    // Called asynchronously
    socket.connect(noopListener)
    setTimeout(() => {
      openConnection()
    }, 0)

    await socket.send(getActionTracesMessage({ account: "test" }))
    expect(mockedWebSocket.send).toHaveBeenCalledTimes(1)
  })

  it("send correctly reconnects when not connected", async () => {
    const socket = createEoswsSocket(factory)
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    await socket.send(getActionTracesMessage({ account: "test" }, { listen: true }))

    expect(mockedWebSocket.send).toHaveBeenCalledTimes(1)
    expect(mockedWebSocket.send).toHaveBeenCalledWith(
      '{"type":"get_action_traces","listen":true,"data":{"account":"test"}}'
    )
  })

  it("send pong message when keep alive sets to true", async () => {
    const socket = createEoswsSocket(factory, { keepAlive: true, keepAliveIntervalInMs: 10 })
    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()

    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    await waitFor(12)

    expect(mockedWebSocket.send).toHaveBeenCalledTimes(1)
    expect(mockedWebSocket.send).toHaveBeenCalledWith('{"type":"pong"}')
  })

  it("stop sending pong message when keep alive sets to true and disconnected", async () => {
    const socket = createEoswsSocket(factory, {
      autoReconnect: false,
      keepAlive: true,
      keepAliveIntervalInMs: 4
    })
    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    setTimeout(() => {
      closeConnection({ code: 1001 })
    }, 5)

    await waitFor(5)

    expect(mockedWebSocket.send).toHaveBeenCalledTimes(1)
    expect(mockedWebSocket.send).toHaveBeenCalledWith('{"type":"pong"}')
  })

  it("no pong messages when keep alive sets to false", async () => {
    const socket = createEoswsSocket(factory, {
      keepAlive: false,
      keepAliveIntervalInMs: 1
    })
    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    await waitFor(3)

    expect(mockedWebSocket.send).toHaveBeenCalledTimes(0)
  })

  it("forwards received message to listener", async () => {
    const socket = createEoswsSocket(factory)
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(accumulatingListener)).resolves.toBeUndefined()
    sendMessageToConnection({ type: InboundMessageType.LISTENING, data: {} })

    expect(receivedMessages).toHaveLength(1)
    expect(receivedMessages[0]).toEqual({ type: InboundMessageType.LISTENING, data: {} })
  })

  it("notifies onInvalidMessage when message type is invalid", async () => {
    const onInvalidMessage = jest.fn()
    const socket = createEoswsSocket(factory, { onInvalidMessage })
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(accumulatingListener)).resolves.toBeUndefined()
    sendRawMessageToConnection({ data: JSON.stringify({ type: "something else" }) })

    expect(onInvalidMessage).toHaveBeenCalledTimes(1)
    expect(onInvalidMessage).toHaveBeenCalledWith({ type: "something else" })
  })

  it("does not forward received message to listener when invalid type", async () => {
    const socket = createEoswsSocket(factory)
    socket.setTokenStorage(storage)

    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(accumulatingListener)).resolves.toBeUndefined()
    sendRawMessageToConnection({ data: JSON.stringify({ type: "something else" }) })

    expect(receivedMessages).toHaveLength(0)
  })

  it("performs a single connect on multiple send calls without being connected yet", async () => {
    const onReconnect = jest.fn()
    const socket = createEoswsSocket(factory, { onReconnect })
    socket.setTokenStorage(storage)

    socket.connect(noopListener).then(() => {
      expect.hasAssertions()

      socket.send(getActionTracesMessage({ account: "test1" }))
      socket.send(getActionTracesMessage({ account: "test2" }))
      socket.send(getActionTracesMessage({ account: "test3" }))

      openConnection()

      expect(onReconnect).toHaveBeenCalledTimes(0)
    })
  })

  const createHandlerExecutor = (handlerName: string) => {
    return (...args: any[]) => {
      const handler = (mockedWebSocket as any)[handlerName]
      if (handler) {
        return handler(...args)
      }

      throw new Error(
        `Cannot execute handler [${handlerName}] on socket mockedWebSocket, it does not exist.`
      )
    }
  }

  const openConnection = createHandlerExecutor("onopen")
  const reopenConnection = createHandlerExecutor("onopen")
  const closeConnection = createHandlerExecutor("onclose")
  const rejectConnection = createHandlerExecutor("onerror")
  const sendRawMessageToConnection = createHandlerExecutor("onmessage")
  const sendMessageToConnection = (message: InboundMessage<any>) => {
    sendRawMessageToConnection({ data: JSON.stringify(message) })
  }

  const cleanupConnection = () => {
    if (mockedWebSocket && mockedWebSocket.onclose) {
      return mockedWebSocket.onclose({ code: 1000, reason: "test clean up", wasClean: true } as any)
    }
  }
})

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

async function waitForReconnectionToTrigger() {
  return await waitFor(2)
}

function waitFor(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
