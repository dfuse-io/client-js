import { createSocket } from "../socket"
import { InboundMessage, InboundMessageType } from "../../message/inbound"
import { getActionTracesMessage } from "../../message/outbound"
import { MockWebSocket } from "./mocks"
import { Deferred } from "../../helpers/promises"

describe("socket", () => {
  let mockWebSocket: MockWebSocket
  let receivedMessages: InboundMessage[]
  const noopListener = (): void => {
    return
  }
  const accumulatingListener = (message: unknown): void => {
    receivedMessages.push(message as InboundMessage)
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
    })

    expect(socket.isConnected).toBeFalsy()
  })

  it("configures handlers on connect", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket),
    })

    setTimeout(() => openConnection(mockWebSocket), 0)

    await expect(socket.connect(noopListener)).resolves.toBeUndefined()

    expect(mockWebSocket.onclose).toBeDefined()
    expect(mockWebSocket.onerror).toBeDefined()
    expect(mockWebSocket.onopen).toBeDefined()
  })

  it("switch to connected on successful connect", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      },
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
      },
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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

  it("reconnects on abnormal close code", async () => {
    const socket = createSocket("any", {
      reconnectDelayInMs: 0,
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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

  it("reconnects on abnormal close code even with other custom stream options", async () => {
    const onError = jest.fn()
    const socket = createSocket("any", {
      reconnectDelayInMs: 0,
      onError,
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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

  it("doesn't try to reconnect on close code 1009 (message too big)", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket),
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
      closeConnection(mockWebSocket, { code: 1009 })
    }, 0)

    expect.hasAssertions()
    await expect(socket.connect(noopListener)).resolves.toBeUndefined()
    reopenConnection(mockWebSocket)

    expect(socket.isConnected).toBeFalsy()
  })

  it("doesn't try to reconnect on abnormal closure when the client initiated the close call", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket),
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
    }, 0)

    const terminationDeferred = new Deferred()

    await expect(
      socket.connect(noopListener, {
        onTermination() {
          terminationDeferred.resolve()
        },
      })
    ).resolves.toBeUndefined()

    setTimeout(() => {
      closeConnection(mockWebSocket, { code: 1001 })
    }, 0)
    await socket.disconnect()
    await terminationDeferred.promise()

    expect(socket.isConnected).toBeFalsy()
  })

  it("doesn't try to reconnect when autoReconnect is false", async () => {
    const socket = createSocket("any", {
      autoReconnect: false,
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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

  // eslint-disable-next-line jest/no-done-callback
  it("calling disconnect is idempotent when current disconnect in progress", async (done) => {
    const onClose = (event: any): void => {
      expect(event).toEqual("something")
      done()
    }

    const socket = createSocket("any", {
      onClose,
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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

  // eslint-disable-next-line jest/no-done-callback
  it("notifies onClose even after disconnect has been called", async (done) => {
    const onError = jest.fn()
    const onClose = (event: any): void => {
      expect(event).toEqual("something")
      done()
    }

    const socket = createSocket("any", {
      onError,
      onClose,
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      '{"type":"get_action_traces","req_id":"test","data":{"accounts":"test"},"listen":true}'
    )
  })

  it("send pong message when keep alive sets to true", async () => {
    const socket = createSocket("any", {
      keepAlive: true,
      keepAliveIntervalInMs: 4,
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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
      webSocketFactory: createWebSocketFactory(mockWebSocket),
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

  it("performs a single connect on multiple send calls without being connected yet", async () => {
    const onReconnect = jest.fn()
    const socket = createSocket("any", {
      onReconnect,
      webSocketFactory: createWebSocketFactory(mockWebSocket),
    })

    setTimeout(() => openConnection(mockWebSocket), 0)

    await socket.connect(noopListener)

    await socket.send(getActionTracesMessage({ accounts: "test1" }, { req_id: "test1" }))
    await socket.send(getActionTracesMessage({ accounts: "test2" }, { req_id: "test2" }))
    await socket.send(getActionTracesMessage({ accounts: "test3" }, { req_id: "test3" }))

    openConnection(mockWebSocket)

    expect(onReconnect).toHaveBeenCalledTimes(0)
  })

  it("is able to connect again when no fully closed yet", async () => {
    const socket = createSocket("any", {
      webSocketFactory: createWebSocketFactory(mockWebSocket),
    })

    setTimeout(() => {
      openConnection(mockWebSocket)
    })

    await socket.connect(noopListener)

    expect(socket.isConnected).toBeTruthy()

    const reconnectionDeferred = new Deferred()

    // Starts an asynchronous disconnect, socket is in half-state after the call has started
    // New `connect` while in this state should "work" correctly
    // eslint-disable-next-line jest/valid-expect-in-promise
    socket.disconnect().catch(() => {
      reconnectionDeferred.reject("disconnect failed")
    })

    setTimeout(async () => {
      // Starts a connect phase while in half-state of disconnection
      // eslint-disable-next-line jest/valid-expect-in-promise
      Promise.race([
        Promise.all([socket.connect(noopListener), socket.connect(noopListener)]),
        rejectAfter(50),
      ])
        .then(() => {
          reconnectionDeferred.resolve()
          return
        })
        .catch((error) => {
          reconnectionDeferred.reject(error)
          return
        })

      await waitFor(0)

      closeConnection(mockWebSocket, { code: 1001 })

      await waitFor(0)
      openConnection(mockWebSocket)
    }, 0)

    await expect(reconnectionDeferred.promise()).resolves.toBeUndefined()
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
  const sendMessageToConnection = (socket: MockWebSocket, message: InboundMessage): void => {
    sendRawMessageToConnection(socket, { data: JSON.stringify(message) })
  }

  const rejectConnection = (socket: MockWebSocket, ...args: any): void => {
    errorConnection(socket, ...args)
    closeConnection(socket, ...args)
  }

  const cleanupConnection = (socket: MockWebSocket): void => {
    if (socket && socket.onclose) {
      return socket.onclose({
        code: 1000,
        reason: "test clean up",
        wasClean: true,
      } as any)
    }
  }
})

function createWebSocketFactory(mockWebSocket: MockWebSocket) {
  return async () => {
    return Promise.resolve(mockWebSocket)
  }
}

async function waitForReconnectionToTrigger(): Promise<void> {
  return await waitFor(2)
}

function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function rejectAfter(ms: number): Promise<void> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      reject("timeout reached")
    }, ms)
  )
}
