import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  InboundMessage,
  InboundMessageType,
  waitFor,
  SocketOptions,
  Stream
} from "@dfuse/client"

/**
 * In this example, we will show case how to be get notifications when certain
 * events happen in the client and underlying socket.
 *
 * You will probably don't see that much here, unless you are able to
 * generation a closing of the connection and then letting it come
 * back. Restarting the network interface while the script is running
 * might work.
 *
 * In this example, you will registering listener for the following events:
 * - Socket `onError`: when an error occurs with the connection, you will still receive an `onClose` right aftet this one.
 * - Socket `onClose`: when the connection of the `Socket` was closed.
 * - Socket `onReconnect`: when the socket has automatically reconnected.
 * - Socket `onInvalidMessage`: when the socket receives a message of type it's not aware of (i.e. it's no in the enum `InbountMessageType`).
 *
 * We will also register an `onPostRestart` listener on the `Stream`, which is called after
 * a `listen` has been sent back to the remote endpoint due to a socket `onReconnect`
 * event.
 */
async function main() {
  const socketOptions: SocketOptions = {
    onError(event: any) {
      console.log("Socket emitted an error event.", {
        message: event.message,
        error: event.error
      })
    },

    onClose(event: any) {
      console.log("Socket has closed its onnection.", { reason: event.reason, code: event.code })
    },

    onReconnect() {
      console.log("Socket has been reconnected with remote server.")

      console.log("Registering and updating stream.")
      client.streamActionTraces(data, onMessage).then((transferStream) => {
        stream = transferStream
      })
    },

    onInvalidMessage(message: any) {
      console.log("Socket has received a message of type it does not handle.", message.type)
    }
  }

  let stream: Stream
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
    streamClientOptions: {
      socketOptions
    }
  })

  const data = {
    accounts: "eosio.token",
    action_names: "transfer"
  }

  stream = await client.streamActionTraces(data, onMessage)
  console.log("Socket is now connected.")

  stream.onPostRestart = () => {
    console.log()
    console.log(
      "<============= Stream has restart to its previous point (or HEAD if never `mark()`) =============>"
    )
  }

  await waitFor(35000)
  await stream.close()
}

function onMessage(message: InboundMessage) {
  if (message.type === InboundMessageType.LISTENING) {
    console.log("Stream is now listening.")
  }
}

runMain(main)
