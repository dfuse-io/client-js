import {
  ApiTokenManager,
  createApiTokenManager,
  createNoopApiTokenManager,
  isApiTokenExpired
} from "../api-token-manager"
import { MockApiTokenStore, MockRefreshScheduler, mock } from "./mocks"
import { ApiTokenInfo } from "../../types/auth-token"

// In milliseconds
const currentDate = 1000000

// Expirations is in seconds!
const nonExpiredApiTokenInfo = { token: "non-expired-far", expires_at: 2000 }
const nonExpiredJustBeforeApiTokenInfo = { token: "non-expired-just-before", expires_at: 1001 }
const expiredTokenInfo = { token: "expired-far", expires_at: 100 }
const expiredRightOnApiTokenInfo = { token: "expired-right-on", expires_at: 1000 }
const expiredJustAfterApiTokenInfo = { token: "expired-just-after", expires_at: 999 }
const noopApiTokenInfo = { token: "aa.bb.cc", expires_at: 0 }

const defaultFetchApiTokenInfo = nonExpiredApiTokenInfo

describe("ApiTokenManager", () => {
  let fetchApiToken: jest.Mock
  let onTokenRefresh: jest.Mock
  let apiTokenStore: MockApiTokenStore
  let refreshScheduler: MockRefreshScheduler
  let manager: ApiTokenManager

  beforeEach(() => {
    spyOn(Date, "now").and.returnValue(currentDate)

    fetchApiToken = mock<Promise<ApiTokenInfo>>(() => Promise.resolve(defaultFetchApiTokenInfo))
    onTokenRefresh = mock()
    apiTokenStore = new MockApiTokenStore()
    refreshScheduler = new MockRefreshScheduler()

    manager = createApiTokenManager(
      fetchApiToken,
      onTokenRefresh,
      0.95,
      apiTokenStore,
      refreshScheduler
    )
  })

  it("should call fetchApiToken when no token in storage", async () => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(undefined))

    const result = await manager.getTokenInfo()
    expect(fetchApiToken).toHaveBeenCalledTimes(1)
    expect(result).toEqual(defaultFetchApiTokenInfo)
  })

  it("should return stored token when present in storage and non-expired", async () => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(nonExpiredApiTokenInfo))

    const result = await manager.getTokenInfo()
    expect(fetchApiToken).toHaveBeenCalledTimes(0)
    expect(result).toEqual(nonExpiredApiTokenInfo)
  })

  it("should call fetchApiToken when present in storage and expired", async () => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(expiredTokenInfo))

    const result = await manager.getTokenInfo()
    expect(fetchApiToken).toHaveBeenCalledTimes(1)
    expect(result).toEqual(defaultFetchApiTokenInfo)
  })

  it("schedules a refresh when no token in storage", async () => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(undefined))

    await manager.getTokenInfo()
    expect(refreshScheduler.scheduleMock).toHaveBeenCalledTimes(1)
    expect(refreshScheduler.scheduleMock.mock.calls[0][0]).toEqual(950)
  })

  it("schedules a refresh when token present in storage but expired", async () => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(expiredTokenInfo))

    await manager.getTokenInfo()
    expect(refreshScheduler.scheduleMock).toHaveBeenCalledTimes(1)
    expect(refreshScheduler.scheduleMock.mock.calls[0][0]).toEqual(950)
  })

  it("schedules a refresh when token in storage, not expired, and no previous schedule", async () => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(nonExpiredApiTokenInfo))

    await manager.getTokenInfo()
    expect(refreshScheduler.scheduleMock).toHaveBeenCalledTimes(1)
    expect(refreshScheduler.scheduleMock.mock.calls[0][0]).toEqual(950)
  })

  it("does not schedule a refresh when token in storage, not expired and previous schedule exists", async () => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(nonExpiredApiTokenInfo))
    refreshScheduler.hasScheduledJobMock.mockReturnValue(true)

    await manager.getTokenInfo()
    expect(refreshScheduler.scheduleMock).toHaveBeenCalledTimes(0)
  })

  it("schedules a refresh when refresh schedule callback is called, even when schedule exists", async (done) => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(expiredTokenInfo))

    await manager.getTokenInfo()
    expect(refreshScheduler.scheduleMock).toHaveBeenCalledTimes(1)

    const refreshCallBack = refreshScheduler.scheduleMock.mock.calls[0][1]

    refreshScheduler.hasScheduledJobMock.mockReturnValue(true)

    onTokenRefresh.mockImplementation(() => {
      expect(refreshScheduler.scheduleMock).toHaveBeenCalledTimes(2)
      done()
    })

    refreshCallBack()
  })

  it("notifies onTokenRefresh when token not present in storage", async () => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(undefined))

    await manager.getTokenInfo()
    expect(onTokenRefresh).toHaveBeenCalledTimes(1)
    expect(onTokenRefresh).toHaveBeenCalledWith(defaultFetchApiTokenInfo.token)
  })

  it("notifies onTokenRefresh when token present in storage but expired", async () => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(expiredTokenInfo))

    await manager.getTokenInfo()
    expect(onTokenRefresh).toHaveBeenCalledTimes(1)
    expect(onTokenRefresh).toHaveBeenCalledWith(defaultFetchApiTokenInfo.token)
  })

  it("does not notify onTokenRefresh when token in storage and not expired", async () => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(nonExpiredApiTokenInfo))

    await manager.getTokenInfo()
    expect(onTokenRefresh).toHaveBeenCalledTimes(0)
  })

  it("notifies onTokenRefresh when refresh schedule callback is called", async (done) => {
    apiTokenStore.getMock.mockReturnValue(Promise.resolve(expiredTokenInfo))

    await manager.getTokenInfo()
    expect(refreshScheduler.scheduleMock).toHaveBeenCalledTimes(1)

    const refreshCallBack = refreshScheduler.scheduleMock.mock.calls[0][1]

    onTokenRefresh.mockImplementation((token: ApiTokenInfo) => {
      expect(token).toEqual(defaultFetchApiTokenInfo.token)
      done()
    })

    refreshCallBack()
  })

  it("releases scheduler and api token store on release", () => {
    manager.release()
    expect(apiTokenStore.releaseMock).toHaveBeenCalledTimes(1)
    expect(refreshScheduler.releaseMock).toHaveBeenCalledTimes(1)
  })
})

describe("NoopApiTokenManager", () => {
  let manager: ApiTokenManager

  beforeEach(() => {
    spyOn(Date, "now").and.returnValue(currentDate)

    manager = createNoopApiTokenManager("aa.bb.cc")
  })

  it("should return hardwired token", async () => {
    const result = await manager.getTokenInfo()
    expect(result).toEqual(noopApiTokenInfo)
  })
})

describe("isApiTokenExpired", () => {
  const testCases = [
    { token: nonExpiredApiTokenInfo, isExpired: false },
    { token: nonExpiredJustBeforeApiTokenInfo, isExpired: false },
    { token: expiredTokenInfo, isExpired: true },
    { token: expiredRightOnApiTokenInfo, isExpired: true },
    { token: expiredJustAfterApiTokenInfo, isExpired: true }
  ]

  testCases.forEach((testCase) => {
    it(`should pass test case ${testCase.token.token}`, () => {
      spyOn(Date, "now").and.returnValue(currentDate)

      expect(isApiTokenExpired(testCase.token)).toEqual(testCase.isExpired)
    })
  })
})
