import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../../config"
import { createDfuseClient, InboundMessage, waitFor, Stream } from "@dfuse/client"

/**
 * In this example, we showcase how the library always keeps your
 * streams active. By default, the library will automatically restart all
 * your active streams after a reconnection event occurred on the
 * underlying socket.
 *
 * With zero effort from your part, your stream is always receiving
 * messages. This pattern can be used when you only really need a never ending
 * streaming of messages, whithout caring about any messages that may have
 * missed while being disconnected from the socket.
 *
 * It's possible to deactivate this behavior by using the [[StreamClientOptions]]
 * `autoRestartStreamsOnReconnect` and set it to `false`.
 *
 * **Important**
 * If it's really important to never miss a single message, you will need to also mark
 * progress to ensure you reconnect at the right moment. Look at the `never-miss-a-beat.ts`
 * example that showcases how to implement a bulletproof data integrity pattern and ensure
 * you never miss or skip an important message by mistake.
 */
async function main(): Promise<void> {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
  })

  const stream: Stream = await client.streamActionTraces(
    {
      accounts: "eosio.token",
      action_names: "create",
    },
    onMessage
  )

  stream.onPostRestart = () => {
    console.log("Socket reconnected, your stream(s) have restarted automatically!")
  }

  console.log("Socket is now connected.")

  await waitFor(38000)
  await stream.close()

  client.release()
}

function onMessage(message: InboundMessage): void {
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
