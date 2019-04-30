import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK, prettifyJson } from "../config"
import { createDfuseClient, InboundMessage, InboundMessageType, waitFor } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = await client.streamTransaction(
    { id: "d9e98cec9fcb5604da38ca250eb22246520bfeee2c35298032c2fbb825eb406d" },
    (message: InboundMessage) => {
      if (message.type !== InboundMessageType.TRANSACTION_LIFECYCLE) {
        return
      }

      console.log(prettifyJson(message.data))
    }
  )

  await waitFor(5000)
  await stream.close()
}

runMain(main)
