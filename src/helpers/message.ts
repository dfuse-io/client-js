import { OnStreamMessage, OnStreamMarker } from "../types/stream-client"
import { InboundMessage } from "../message/inbound"

/**
 * This small utility is useful to implement a dynamic dispatcher
 * based on the type of message. That is usefull to avoid having to
 * code yourself a `switch (message.type) { ... }` switch case.
 *
 * Instead, define a series of specific of handlers on a class or
 * an object, then when calling the stream method of your choices,
 * pass the dynamic dispatcher created by calling this method as
 * the message handler.
 *
 * The created dispatcher upon each message, will check the received
 * type to handler map and will dispatch it there.
 *
 * ```
 * const dispatch = dynamicMessageDispatcher({
 *   listening: this.onListening,
 *   progress: this.onProgress,
 *   action_trace: this.onAction,
 * })
 *
 * client.streamActionTraces({ ... }, dispatcher)
 * ```
 */
export function dynamicMessageDispatcher(typeToDispatcher: {
  [messageType: string]: OnStreamMessage
}): OnStreamMessage {
  return (message: InboundMessage, marker: OnStreamMarker) => {
    const dispatcher = typeToDispatcher[message.type]
    if (dispatcher) {
      dispatcher(message, marker)
    }
  }
}
