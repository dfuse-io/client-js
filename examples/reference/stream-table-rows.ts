import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK, prettifyJson } from "../config"
import { createDfuseClient, InboundMessage, InboundMessageType, waitFor } from "@dfuse/client"

async function main(): Promise<void> {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
  })

  const stream = await client.streamTableRows(
    { code: "eosio", scope: "eosio", table: "global" },
    (message: InboundMessage) => {
      if (message.type === InboundMessageType.LISTENING) {
        console.log(prettifyJson(message.data))
        return
      }

      if (message.type === InboundMessageType.TABLE_SNAPSHOT) {
        console.log(prettifyJson(message.data))
        return
      }

      if (message.type === InboundMessageType.TABLE_DELTA) {
        console.log(prettifyJson(message.data))
        return
      }

      if (message.type === InboundMessageType.ERROR) {
        console.log(prettifyJson(message.data))
        return
      }
    },
    { fetch: true }
  )

  await waitFor(15000)
  await stream.close()

  client.release()
}

runMain(main)
