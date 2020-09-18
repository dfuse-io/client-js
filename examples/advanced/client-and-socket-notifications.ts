import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  InboundMessage,
  InboundMessageType,
  waitFor,
  SocketOptions,
  GraphqlStreamMessage,
} from "@dfuse/client"

/**
 * In this example, we will showcase how to be get notifications when certain
 * events happen in the client and underlying socket.
 *
 * You probably won't see that much here, unless you are able to
 * generate a closing of the connection and then allow it to come
 * back. Restarting the network interface while the script is running
 * might achieve this.
 *
 * In this example, you will register a listener for the following events:
 * - Socket `onError`: when an error occurs with the connection. You will still receive an `onClose` right aftet this one.
 * - Socket `onClose`: when the connection of the `Socket` was closed.
 * - Socket `onReconnect`: when the socket has automatically reconnected.
 *
 * We will also register an `onPostRestart` listener on the `Stream`, which is called after
 * a `listen` has been sent back to the remote endpoint due to a socket `onReconnect`.
 *
 * The example also show all cases that can happen with both streaming methods.
 */
async function main(): Promise<void> {
  const socketOptions: SocketOptions = {
    onError(event: any) {
      console.log("Socket emitted an error event.", {
        message: event.message,
        error: event.error,
      })
    },

    onClose(event: any) {
      console.log("Socket has closed its connection.", { reason: event.reason, code: event.code })
    },

    onReconnect() {
      console.log("Socket has been reconnected with remote server.")
    },
  }

  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
    streamClientOptions: {
      socketOptions,
    },
    graphqlStreamClientOptions: {
      socketOptions,
    },
  })

  const graphqlOperation = `subscription($cursor: String!) {
    searchTransactionsForward(query: "action:onblock", cursor: $cursor) {
      undo cursor
      block { num timestamp }
    }
  }`

  const graphqlStream = await client.graphql(
    graphqlOperation,
    (message: GraphqlStreamMessage<any>) => {
      if (message.type === "error") {
        // When `terminal: true`, an auto-reconnection is automatically performed
        console.log("GraphQL stream error.", message.errors, message.terminal)
        return
      }

      if (message.type === "data") {
        console.log(
          "GraphQL stream data.",
          JSON.stringify({ ...message.data.searchTransactionsForward, cursor: undefined })
        )

        // Mark latest location where we want to start back at
        graphqlStream.mark({ cursor: message.data.searchTransactionsForward.cursor })
      }

      if (message.type === "complete") {
        console.log("GraphQL stream completed.")
      }
    }
  )

  graphqlStream.onPostRestart = () => {
    console.log()
    console.log(
      "<============= GraphQL stream has restarted to its previous `mark()` location =============>"
    )
  }

  const wsStream = await client.streamHeadInfo((message: InboundMessage) => {
    if (message.type === InboundMessageType.ERROR) {
      console.log("WebSocket stream error.", message.data)
      return
    }

    if (message.type === InboundMessageType.LISTENING) {
      console.log("WebSocket stream is now listening.")
    }

    if (message.type === InboundMessageType.HEAD_INFO) {
      console.log("WebSocket stream data.", JSON.stringify(message.data))

      // Mark latest location where we want to start back at
      wsStream.mark({ atBlockNum: message.data.head_block_num })
    }
  })

  wsStream.onPostRestart = () => {
    console.log()
    console.log(
      "<============= WebSocket stream has restarted to its previous `mark()` location =============>"
    )
  }

  await waitFor(35000)
  await graphqlStream.close()
  await wsStream.close()

  client.release()
}

runMain(main)
