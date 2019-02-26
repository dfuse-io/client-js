export function createMockEoswsSocket() {
  return {
    isConnected: false,
    setTokenStorage: jest.fn<Promise<void>>(() => new Promise((resolve) => resolve())),
    connect: jest.fn<Promise<void>>(() => new Promise((resolve) => resolve())),
    disconnect: jest.fn<Promise<void>>(() => new Promise((resolve) => resolve())),

    send: jest.fn<Promise<void>>()
  }
}
