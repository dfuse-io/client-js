import { createDfuseClient, InboundMessage, InboundMessageType, waitFor } from "@dfuse/client"
import { IncomingMessage } from "http"
/**
 * In this example, we will show case how to avoid polluting the global
 * scope to configure the `fetch` and `WebSocket` values.
 *
 * Indeed, polluting the global scope is not a recommended practicte
 * specially when alternatives are present to handle those cases.
 *
 * We will configure the `DfuseClient` instance when creating it via
 * the factory to pass the `fetch` and `WebSocket options directly.
 *
 * **Note** This example completely avoids importing `../config` to ensure
 *          we really do not compute the global scope. Ensures you have the
 *          appropriate environment variables set.
 */

// We add the example imports here to make the example clearer, in your
// own code, group them with yours.
import nodeFetch from "node-fetch"
import WebSocketClient from "ws"

async function main() {
  const client = createDfuseClient({
    apiKey: process.env.DFUSE_API_KEY!,
    network: process.env.DFUSE_API_NETWORK || "mainnet",
    httpClientOptions: {
      fetch: nodeFetch
    },
    streamClientOptions: {
      socketOptions: {
        /**
         * The factory receives the full resolved URL, API token included,
         * of the remote endpoint to connect to.
         *
         * It's here also, when using the Node.js enviroment, in your own
         * factory, that you can customize the WebSocket client instance.
         * In the factory below, we jump the `maxPayload` size to 200M,
         * this can be useful when streaming really big tables like the
         * `voters` table on EOS.
         *
         * We also add an error logging of errors occurring at the HTTP Upgrade
         * level before turning the connection into a WebSocket connection. This
         * can happens when authorization happens with your API token.
         *
         * **Note** Don't try to override the `onopen`, `onclose`, `onerror`
         * and `onmessage` handler, they are overwritten by the `Socket` instance
         * for its own usage.
         *
         * **Important Web Browser Usage Notice**
         * We are in a Node.js context here, the `WebSocketClient` is a
         * Node.js implementation of WebSocket Protocol. It does not have
         * quite the same API interface, the configuration done below
         * will not work in a Browser environment! Check W3C Browser
         * WebSocket API to see what is accepted as it's second argument.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket#Parameters
         */
        webSocketFactory: async (url: string) => {
          const webSocket = new WebSocketClient(url, {
            handshakeTimeout: 30 * 1000, // 30s
            maxPayload: 200 * 1024 * 1000 * 1000 // 200Mb
          })

          const onUpgrade = (response: IncomingMessage) => {
            console.log("Socket upgrade response status code.", response.statusCode)

            // You need to remove the listener at some point since this factory
            // is called at each re-connection with the remote endpoint!
            webSocket.removeListener("upgrade", onUpgrade)
          }

          webSocket.on("upgrade", onUpgrade)

          return webSocket
        }
      }
    }
  })

  const stream = await client.streamActionTraces(
    {
      accounts: "eosio.token",
      action_names: "issue"
    },
    onMessage
  )
  console.log("Socket is now connected.")

  await waitFor(35000)
  await stream.close()
}

function onMessage(message: InboundMessage) {
  if (message.type === InboundMessageType.LISTENING) {
    console.log("Stream is now listening.")
  }
}

main()
  .then(() => {
    console.log("Example completed.")
    process.exit(0)
  })
  .catch((error) => {
    console.log("An untrapped error occurred.", error)
    process.exit(1)
  })
