import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  InboundMessage,
  InboundMessageType,
  waitFor,
  Stream
} from "@dfuse/client"

/**
 * In this example, we will showcase of how to always correctly stream
 * receives events even after a reconnection to the socket.
 *
 * This pattern can be used when you only need to have a never ending
 * streaming of events, whithout caring about catching up with missed
 * events by the time the socket was closed.
 *
 * We will show and example how to easily re-subscribe your previous
 * stream when the socket re-connects.
 *
 * **Important** If it's really important to never miss a single event,
 *               don't use this re-connection pattern. Instead look at the
 *               `never-miss-a-beat.ts` example that showcases how to
 *               implement bullet proof data integrity pattern and ensure
 *               you never miss of skip an important event by mistake.
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
           * manually. In this sample, simply re-register the stream and
           * re-assign your stream variable to point to the updated
           * stream.
           */
          console.log("Socket has been reconnected with remote server.")

          console.log("Registering and updating stream.")
          client.streamActionTraces(data, onMessage).then((transferStream) => {
            // Don't forget to assign the stream variable it's new handle, the old
            // stream is not valid anymore and should be discarded.
            stream = transferStream
          })
        }
      }
    }
  })

  const data = {
    account: "eosio.token",
    action_name: "transfer"
  }

  let stream: Stream = await client.streamActionTraces(data, onMessage)

  console.log("Socket is now connected.")

  await waitFor(35000)
  await stream.unlisten()
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
