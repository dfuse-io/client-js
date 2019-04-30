import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK, prettifyJson } from "../config"
import { createDfuseClient, InboundMessage, InboundMessageType, waitFor } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = await client.streamTableRows(
    { code: "eosio", scope: "eosio", table: "global" },
    (message: InboundMessage) => {
      if (message.type !== InboundMessageType.TABLE_DELTA) {
        return
      }

      console.log(prettifyJson(message.data))
    }
  )

  await waitFor(15000)
  await stream.close()
}

runMain(main)
