import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, InboundMessage, waitFor, Stream } from "@dfuse/client"

/**
 * In this example, we will showcase how to implement bullet proof
 * data integrity when using the dfuse Stream by ensuring you never
 * miss a single beat.
 *
 * This pattern can be used when you need to process messages only
 * once while still ensuring you correctly get all your blocks,
 * transactions and actions you want to process.
 *
 * We will show and example how to easily mark the stream progress
 * and how the marker is then used when the socket re-connects to
 * restart the stream at the exact location you need.
 *
 * @see
 */
async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
    streamClientOptions: {
      socketOptions: {
        onReconnect() {
          /**
           * This listener is called by the socket right after a connection
           * has be re-open with the server. This is not called on the initial
           * connection.
           *
           * It's in this method that you should re-connect all your stream
           * manually. In this sample, simply restart the stream.
           */
          console.log("Socket has been reconnected with remote server, restarting stream.")
          stream.restart()
        }
      }
    }
  })

  const stream: Stream = await client.streamActionTraces(
    {
      account: "eosio.token",
      action_name: "create"
    },
    onMessage
  )

  console.log("Socket is now connected.")

  await waitFor(38000)
  await stream.close()
}

function onMessage(message: InboundMessage) {
  if (message.type === "listening") {
    console.log("Stream is now listening.")
    return
  }

  if (message.type === "action_trace") {
    console.log("Streaming transfer.")
  }
}

runMain(main)
