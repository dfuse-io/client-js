import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK, prettifyJson } from "../config"
import { createDfuseClient, InboundMessage, InboundMessageType, waitFor } from "@dfuse/client"

async function main(): Promise<void> {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
  })

  const stream = await client.streamTransaction(
    { id: "d2233029848840cc67c32a617b7339664a5866bf229a1833afccc3b4653f594a" },
    (message: InboundMessage) => {
      if (message.type === InboundMessageType.LISTENING) {
        console.log(prettifyJson(message.data))
        return
      }

      if (message.type === InboundMessageType.TRANSACTION_LIFECYCLE) {
        console.log(prettifyJson(message.data))
        return
      }

      if (message.type === InboundMessageType.ERROR) {
        console.log(prettifyJson(message.data))
        return
      }
    }
  )

  await waitFor(5000)
  await stream.close()

  client.release()
}

runMain(main)
