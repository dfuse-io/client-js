import { createClient, getActionTracesMessage, InboundMessage, InboundMessageType } from ".."

describe("client", () => {
  let controller: ReturnType<typeof createSocketController>
  let factory: () => WebSocket
  let receivedMessages: Array<InboundMessage<any>>
  const noopListener = () => null
  const accumulatingListener = (type: InboundMessageType, message: InboundMessage<any>) => {
    receivedMessages.push(message)
  }

  beforeEach(() => {
    controller = createSocketController()
    factory = () => controller as any
    receivedMessages = []
  })

  it("starts disconnected by default", () => {
    const client = createClient(factory)

    expect(client.isConnected).toBeFalsy()
  })

  it("configures handlers on connect", () => {
    const client = createClient(factory)
    client.connect(noopListener)

    expect(controller.onclose).toBeDefined()
    expect(controller.onerror).toBeDefined()
    expect(controller.onopen).toBeDefined()
  })

  it("switch to connected on successful connect", async () => {
    const client = createClient(factory)
    setTimeout(() => openConnection(), 0)

    expect.hasAssertions()
    await expect(client.connect(noopListener)).resolves.toBeUndefined()
    expect(client.isConnected).toBeTruthy()
  })

  it("handles connection error properly", async () => {
    const client = createClient(factory)
    setTimeout(() => rejectConnection({ reason: "test" }), 0)

    expect.hasAssertions()
    await expect(client.connect(noopListener)).rejects.toEqual({ reason: "test" })
    expect(client.isConnected).toBeFalsy()
  })

  it("notifies onReconnect when reconnection", async () => {
    const onReconnect = jest.fn()
    const client = createClient(factory, { autoReconnect: true, onReconnect })
    setTimeout(() => {
      openConnection()
      closeConnection({ code: 1001 })
    }, 0)

    expect.hasAssertions()
    await expect(client.connect(noopListener)).resolves.toBeUndefined()
    reopenConnection()

    expect(onReconnect).toHaveBeenCalledTimes(1)
    expect(onReconnect).toHaveBeenCalledWith()
  })

  it("notifies onError when error occurred on connect", async () => {
    const onError = jest.fn()
    const client = createClient(factory, { onError })
    setTimeout(() => {
      rejectConnection()
    }, 0)

    expect.hasAssertions()
    await expect(client.connect(noopListener)).rejects.toBeUndefined()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith()
  })

  it("notifies onError when error occurred after succesfull connection", async () => {
    const onError = jest.fn()
    const client = createClient(factory, { onError })
    setTimeout(() => {
      openConnection()
      rejectConnection()
    }, 0)

    expect.hasAssertions()
    await expect(client.connect(noopListener)).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith()
  })

  it("reconnects on abnormal close code ", async () => {
    const client = createClient(factory)
    setTimeout(() => {
      openConnection()
      closeConnection({ code: 1001 })
    }, 0)

    expect.hasAssertions()
    await expect(client.connect(noopListener)).resolves.toBeUndefined()
    reopenConnection()

    expect(client.isConnected).toBeTruthy()
  })

  it("doesn't try to reconnect on close code 1000 (normal closure)", async () => {
    const client = createClient(factory)
    setTimeout(() => {
      openConnection()
      closeConnection({ code: 1000 })
    }, 0)

    expect.hasAssertions()
    await expect(client.connect(noopListener)).resolves.toBeUndefined()
    reopenConnection()

    expect(client.isConnected).toBeFalsy()
  })

  it("doesn't try to reconnect on close code 1005 (no status code present)", async () => {
    const client = createClient(factory)
    setTimeout(() => {
      openConnection()
      closeConnection({ code: 1005 })
    }, 0)

    expect.hasAssertions()
    await expect(client.connect(noopListener)).resolves.toBeUndefined()
    reopenConnection()

    expect(client.isConnected).toBeFalsy()
  })

  it("send message correctly when connected", async () => {
    const client = createClient(factory)
    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(client.connect(noopListener)).resolves.toBeUndefined()

    setTimeout(() => {
      openConnection()
    }, 0)
    await client.send(getActionTracesMessage({ account: "test" }))

    expect(controller.send).toHaveBeenCalledTimes(1)
  })

  it("send waits for connect before sending", async () => {
    const client = createClient(factory)

    expect.hasAssertions()

    // Called asynchronously
    client.connect(noopListener)
    setTimeout(() => {
      openConnection()
    }, 0)

    await client.send(getActionTracesMessage({ account: "test" }))
    expect(controller.send).toHaveBeenCalledTimes(1)
  })

  it("send correctly reconnects when not connected", async () => {
    const client = createClient(factory)
    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(client.connect(noopListener)).resolves.toBeUndefined()
    await client.send(getActionTracesMessage({ account: "test" }, { listen: true }))

    expect(controller.send).toHaveBeenCalledTimes(1)
    expect(controller.send).toHaveBeenCalledWith(
      '{"type":"get_action_traces","listen":true,"data":{"account":"test"}}'
    )
  })

  it("forwards received message to listener", async () => {
    const client = createClient(factory)
    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(client.connect(accumulatingListener)).resolves.toBeUndefined()
    sendMessageToConnection({ type: InboundMessageType.LISTENING, data: {} })

    expect(receivedMessages).toHaveLength(1)
    expect(receivedMessages[0]).toEqual({ type: InboundMessageType.LISTENING, data: {} })
  })

  it("notifies onInvalidMessage when message type is invalid", async () => {
    const onInvalidMessage = jest.fn()
    const client = createClient(factory, { onInvalidMessage })
    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(client.connect(accumulatingListener)).resolves.toBeUndefined()
    sendRawMessageToConnection({ data: JSON.stringify({ type: "something else" }) })

    expect(onInvalidMessage).toHaveBeenCalledTimes(1)
    expect(onInvalidMessage).toHaveBeenCalledWith({ type: "something else" })
  })

  it("does not forward received message to listener when invalid type", async () => {
    const client = createClient(factory)
    setTimeout(() => {
      openConnection()
    }, 0)

    expect.hasAssertions()
    await expect(client.connect(accumulatingListener)).resolves.toBeUndefined()
    sendRawMessageToConnection({ data: JSON.stringify({ type: "something else" }) })

    expect(receivedMessages).toHaveLength(0)
  })

  const createHandlerExecutor = (handlerName: string) => {
    return (...args: any[]) => {
      const handler = (controller as any)[handlerName]
      if (handler) {
        return handler(...args)
      }

      throw new Error(
        `Cannot execute handler [${handlerName}] on socket controller, it does not exist.`
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
