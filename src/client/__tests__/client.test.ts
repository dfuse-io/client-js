import { createClient } from ".."

describe("client", () => {
  let controller: ReturnType<typeof createSocketController>
  let factory: () => WebSocket

  beforeEach(() => {
    controller = createSocketController()
    factory = () => controller as any
  })

  it("starts disconnected by default", () => {
    const client = createClient(factory)

    expect(client.isConnected()).toBeFalsy()
  })

  it("configures handlers on connect", async () => {
    const client = createClient(factory)
    client.connect()

    expect(controller.onclose).toBeDefined()
    expect(controller.onerror).toBeDefined()
    expect(controller.onopen).toBeDefined()
  })

  it("switch to connected on successful connect", async () => {
    const client = createClient(factory)
    setTimeout(() => acceptConnection(), 0)

    expect.assertions(1)

    await expect(client.connect()).resolves
    expect(client.isConnected()).toBeTruthy()
  })

  it("handles connection error properly", async () => {
    const client = createClient(factory)
    setTimeout(() => rejectConnection(), 0)

    expect.assertions(1)

    await expect(client.connect()).resolves
    expect(client.isConnected()).toBeTruthy()
  })

  const acceptConnection = () => {
    if (controller.onopen) {
      return controller.onopen()
    }

    throw new Error("Cannot open connection, socket not initialized correctly")
  }

  const rejectConnection = () => {
    if (controller.onerror) {
      return controller.onerror({ reason: "test" } as any)
    }

    throw new Error("Cannot reject connection, socket not initialized correctly")
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
