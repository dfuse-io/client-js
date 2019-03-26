import { EoswsListeners, ListenerObject } from "../listeners"
import { InboundMessageType } from "../../message/inbound"
import { EoswsClient, EoswsSocket, OutboundMessageType } from "../.."
import { createMockEoswsSocket } from "./mocks"
import fetch from "jest-fetch-mock"

describe("listeners", function() {
  const noopCallback = () => {
    return
  }

  const subscriptionMessage = {
    type: OutboundMessageType.GET_ACTION_TRACES,
    req_id: "abc",
    data: { test: "test" }
  }

  describe("addListener", () => {
    it("should add a listener to the list", () => {
      const listenerObject: ListenerObject = {
        reqId: "abc",
        callback: noopCallback,
        subscriptionMessage
      }

      const listeners = new EoswsListeners()

      listeners.addListener(listenerObject)

      expect(listeners.registeredListeners).toEqual([listenerObject])
    })
  })

  describe("removeListener", () => {
    it("should add a listener to the list", () => {
      const listenerObject1: ListenerObject = {
        reqId: "abc",
        callback: noopCallback,
        subscriptionMessage
      }

      const listenerObject2: ListenerObject = {
        reqId: "abcd",
        callback: noopCallback,
        subscriptionMessage
      }

      const listeners = new EoswsListeners()

      listeners.addListener(listenerObject1)
      listeners.addListener(listenerObject2)
      expect(listeners.registeredListeners).toEqual([listenerObject1, listenerObject2])

      listeners.removeListener("abc")

      expect(listeners.registeredListeners).toEqual([listenerObject2])
    })
  })

  describe("handleMessage", () => {
    it("should process the callback given the right id and type", () => {
      const customCallback = jest.fn()
      const listenerObject1: ListenerObject = {
        reqId: "abc",
        callback: customCallback,
        subscriptionMessage
      }

      const listenerObject2: ListenerObject = {
        reqId: "abcd",
        callback: noopCallback,
        subscriptionMessage
      }

      const listeners = new EoswsListeners()
      listeners.addListener(listenerObject1)
      listeners.addListener(listenerObject2)

      listeners.handleMessage({
        type: InboundMessageType.TABLE_DELTA,
        req_id: "abc",
        data: { test: "foo" }
      })

      expect(customCallback).toHaveBeenCalledWith({
        type: InboundMessageType.TABLE_DELTA,
        req_id: "abc",
        data: { test: "foo" }
      })
    })

    it("should process the callback given the right id and type for progress", () => {
      const customCallback = jest.fn()
      const listenerObject1: ListenerObject = {
        reqId: "abc",
        callback: customCallback,
        subscriptionMessage
      }

      const listenerObject2: ListenerObject = {
        reqId: "abcd",
        callback: noopCallback,
        subscriptionMessage
      }

      const listeners = new EoswsListeners()
      spyOn(listeners, "saveBlockProgress")
      listeners.addListener(listenerObject1)
      listeners.addListener(listenerObject2)

      listeners.handleMessage({
        type: InboundMessageType.PROGRESS,
        req_id: "abc",
        data: { block_num: 12355, block_id: "blockID" }
      })

      expect(customCallback).toHaveBeenCalledWith({
        type: InboundMessageType.PROGRESS,
        req_id: "abc",
        data: { block_num: 12355, block_id: "blockID" }
      })

      expect(listeners.saveBlockProgress).toHaveBeenCalledWith("abc", 12355, "blockID")
    })
  })

  describe("saveBlockProgress", () => {
    it("should save the last block information in the listener", () => {
      const listenerObject: ListenerObject = {
        reqId: "abc",
        callback: noopCallback,
        subscriptionMessage
      }

      const listenerObjectWithBlockInfo: ListenerObject = {
        reqId: "abc",
        callback: noopCallback,
        subscriptionMessage,
        blockNum: 12345,
        blockId: "blockId"
      }

      const listeners = new EoswsListeners()

      listeners.addListener(listenerObject)

      expect(listeners.registeredListeners).toEqual([listenerObject])

      listeners.saveBlockProgress("abc", 12345, "blockId")
      expect(listeners.registeredListeners).toEqual([listenerObjectWithBlockInfo])
    })
  })

  describe("resubscribeAll", () => {
    it("resubscribe to all listeners and use their block num as start block if any", () => {
      const customCallback = jest.fn()
      const listenerObject1: ListenerObject = {
        reqId: "abc",
        callback: customCallback,
        subscriptionMessage: { ...subscriptionMessage, req_id: "abc" }
      }

      const listenerObject2: ListenerObject = {
        reqId: "abcd",
        callback: noopCallback,
        subscriptionMessage: { ...subscriptionMessage, req_id: "abcd" }
      }

      const listenerObject3: ListenerObject = {
        reqId: "abcde",
        callback: noopCallback,
        subscriptionMessage: { ...subscriptionMessage, req_id: "abcde" }
      }

      const listeners = new EoswsListeners()
      listeners.addListener(listenerObject1)
      listeners.addListener(listenerObject2)
      listeners.addListener(listenerObject3)
      listeners.saveBlockProgress("abc", 1300, "blockId2")
      listeners.saveBlockProgress("abcd", 1000, "blockId1")

      const mockSocket = createMockEoswsSocket()
      const socket = (mockSocket as any) as EoswsSocket
      const client = new EoswsClient({ socket, httpClient: fetch as any, baseUrl: "test.io" })
      spyOn(client.socket, "send")
      listeners.resubscribeAll(client)
      expect(client.socket.send).toHaveBeenCalledTimes(3)
      expect(client.socket.send).toHaveBeenCalledWith({
        type: OutboundMessageType.GET_ACTION_TRACES,
        req_id: "abc",
        data: { test: "test" },
        start_block: 1300
      })
      expect(client.socket.send).toHaveBeenCalledWith({
        type: OutboundMessageType.GET_ACTION_TRACES,
        req_id: "abcd",
        data: { test: "test" },
        start_block: 1000
      })

      expect(client.socket.send).toHaveBeenCalledWith({
        type: OutboundMessageType.GET_ACTION_TRACES,
        req_id: "abcde",
        data: { test: "test" }
      })
    })
  })
})
