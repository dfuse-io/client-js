import { EOSListeners, ListenerObject } from "../eos-listeners"
import { InboundMessageType } from "../inbound"

describe("EOSListeners", function() {
  describe("addListener", () => {
    it("should add a listener to the list", () => {
      const listenerObject: ListenerObject = {
        requestId: "abc",
        messageTypes: [InboundMessageType.TABLE_DELTA],
        callback: () => {
          console.log("test")
        }
      }

      const listeners = new EOSListeners()

      listeners.addListener(listenerObject)

      expect(listeners.registeredListeners).toEqual([listenerObject])
    })
  })

  describe("removeListener", () => {
    it("should add a listener to the list", () => {
      const listenerObject1: ListenerObject = {
        requestId: "abc",
        messageTypes: [InboundMessageType.TABLE_DELTA],
        callback: () => {
          console.log("test")
        }
      }

      const listenerObject2: ListenerObject = {
        requestId: "abcd",
        messageTypes: [InboundMessageType.TABLE_DELTA],
        callback: () => {
          console.log("test")
        }
      }

      const listeners = new EOSListeners()

      listeners.addListener(listenerObject1)
      listeners.addListener(listenerObject2)
      expect(listeners.registeredListeners).toEqual([listenerObject1, listenerObject2])

      listeners.removeListener("abc")

      expect(listeners.registeredListeners).toEqual([listenerObject2])
    })
  })

  describe("handleMessage", () => {
    it("should process the callback given the right id and type", () => {
      const listenerObject1: ListenerObject = {
        requestId: "abc",
        messageTypes: [InboundMessageType.TABLE_DELTA],
        callback: () => {
          console.log("test")
        }
      }

      spyOn(listenerObject1, "callback")

      const listenerObject2: ListenerObject = {
        requestId: "abcd",
        messageTypes: [InboundMessageType.TABLE_DELTA],
        callback: () => {
          console.log("test")
        }
      }
      const listeners = new EOSListeners()

      listeners.addListener(listenerObject1)
      listeners.addListener(listenerObject2)

      listeners.handleMessage(InboundMessageType.TABLE_DELTA, {
        type: InboundMessageType.TABLE_DELTA,
        req_id: "abc",
        data: { test: "foo" }
      })

      expect(listenerObject1.callback).toHaveBeenCalledWith(InboundMessageType.TABLE_DELTA, {
        type: InboundMessageType.TABLE_DELTA,
        req_id: "abc",
        data: { test: "foo" }
      })
    })
  })
})
