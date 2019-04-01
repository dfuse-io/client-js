import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, InboundMessage, InboundMessageType, waitFor } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = await client.streamActionTraces(
    { accounts: "eosio.token", action_names: "transfer" },
    (message: InboundMessage<any>) => {
      if (message.type !== InboundMessageType.ACTION_TRACE) {
        return
      }

      const { from, to, quantity, memo } = message.data.trace.act.data
      console.log(`Transfer [${from} -> ${to}, ${quantity}] (${memo})`)
    }
  )

  await waitFor(5000)
  await stream.close()
}

runMain(main)
