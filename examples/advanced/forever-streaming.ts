import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, InboundMessage, waitFor, Stream } from "@dfuse/client"

/**
 * In this example, we showcase how the library always keep your
 * streams active. By default, the library will automatically restart all
 * your active streams after a reconnection event occurred on the
 * underlying socket.
 *
 * With zero effort from your part, your stream is always receiving
 * messages. This pattern can be used when you only really a never ending
 * streaming of messages, whithout caring about those messages that you've
 * missed while being disconnected from the socket.
 *
 * It's possible to avoid this automatic behavior by using the [[StreamClientOptions]]
 * `autoReconnectStreamsOnReconnect` and set it to `false`.
 *
 * **Important**
 * If it's really important to never miss a single message, you will need to also mark
 * progress to ensure you re-connect at the right moment. Look at the `never-miss-a-beat.ts`
 * example that showcases how to implement bullet proof data integrity pattern and ensure
 * you never miss or skip an important message by mistake.
 */
async function main() {
  // This is not required in your own code, present in the example so re-connection can be seen
  const streamClientOptions = {
    socketOptions: {
      onReconnect() {
        console.log("Socket re-connected, your stream(s) will have restarted automatically!")
      }
    }
  }

  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
    streamClientOptions
  })

  const stream: Stream = await client.streamActionTraces(
    {
      accounts: "eosio.token",
      action_names: "create"
    },
    onMessage
  )

  console.log("Socket is now connected.")

  await waitFor(38000)
  await stream.close()
}

function onMessage(message: InboundMessage) {
  if (message.type === "listening") {
    // You should see this message a second time when restart of stream occurs
    console.log("Stream is now listening.")
    return
  }

  if (message.type === "action_trace") {
    console.log("Streaming transfer.")
  }
}

runMain(main)
