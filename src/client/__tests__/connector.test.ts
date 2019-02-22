import { EoswsConnector } from "../connector"
import { ApiTokenStorage } from "../api-token-storage"
import { EoswsClient, HttpClient } from "../client"
import { EoswsSocket } from "../socket"
import fetch from "jest-fetch-mock"
import { createMockEoswsSocket } from "./mocks"
import { RefreshScheduler } from "../refresh-scheduler"

describe("EoswsConnector", function() {
  describe("isExpiring", () => {
    it("should return true when it is expiring", () => {
      spyOn(Date, "now").and.returnValue(12120000)
      const connector = getTestConnector()

      expect(connector.isExpiring({ token: "token", expires_at: 12000 })).toBe(true)
    })

    it("should return true when there is no token", () => {
      spyOn(Date, "now").and.returnValue(12120000)
      const connector = getTestConnector()

      expect(connector.isExpiring(undefined)).toBe(true)
    })

    it("should return false when it is not expiring", () => {
      spyOn(Date, "now").and.returnValue(12120000)
      const connector = getTestConnector()

      expect(connector.isExpiring({ token: "token", expires_at: 13000 })).toBe(false)
    })
  })

  describe("connect", () => {
    it("should call getToken first if nothing in store", () => {
      spyOn(Date, "now").and.returnValue(12120000)
      const connector = getTestConnector()
      spyOn(connector, "getToken").and.returnValue(
        Promise.resolve({ expires_at: 13000, token: "token" })
      )
      spyOn(connector.client, "connect")
      return connector.connect().then(() => {
        expect(connector.getToken).toHaveBeenCalled()
        expect(connector.client.connect).toHaveBeenCalled()
      })
    })

    it("should connect with token from store if it exists", () => {
      spyOn(Date, "now").and.returnValue(12120000)
      const connector = getTestConnector()
      spyOn(connector.tokenStorage, "get").and.returnValue({ expires_at: 13000, token: "token" })
      spyOn(connector.client, "connect")

      return connector.connect().then(() => {
        expect(connector.client.connect).toHaveBeenCalled()
      })
    })
  })

  describe("getToken", () => {
    it("should return stored token if it is not expired", () => {
      spyOn(Date, "now").and.returnValue(12120000)
      const connector = getTestConnector()
      spyOn(connector.tokenStorage, "get").and.returnValue({ expires_at: 13000, token: "token" })
      return connector.getToken().then((apiTokenInfo) => {
        expect(apiTokenInfo).toEqual({ expires_at: 13000, token: "token" })
      })
    })

    it("should return token from refresher if it is expired", () => {
      spyOn(Date, "now").and.returnValue(12120000)
      const connector = getTestConnector()
      spyOn(connector.tokenStorage, "get").and.returnValue({ expires_at: 12000, token: "token" })
      spyOn(connector, "refreshToken").and.returnValue(
        Promise.resolve({ expires_at: 23000, token: "token1" })
      )
      return connector.getToken().then((apiTokenInfo) => {
        expect(apiTokenInfo).toEqual({ expires_at: 23000, token: "token1" })
      })
    })
  })
})

describe("RefreshScheduler", function() {
  class Test {
    public static scheduledMethod() {
      return true
    }
  }

  describe("scheduleNextRefresh", () => {
    it("should call the scheduled method after delay", () => {
      jest.useFakeTimers()
      spyOn(Test, "scheduledMethod")
      const scheduler = new RefreshScheduler(() => Test.scheduledMethod())
      scheduler.scheduleNextRefresh(100)
      expect(Test.scheduledMethod).not.toHaveBeenCalled()
      jest.advanceTimersByTime(100)
      expect(Test.scheduledMethod).toHaveBeenCalledTimes(1)
    })
  })
})

export function getTestConnector() {
  const mockSocket = createMockEoswsSocket()

  const socket = (mockSocket as any) as EoswsSocket
  const mockFetch = fetch as HttpClient
  const client = new EoswsClient({ socket, httpClient: mockFetch, baseUrl: "test.io" })

  return new EoswsConnector({ tokenStorage: new ApiTokenStorage(), apiKey: "apiKey", client })
}
