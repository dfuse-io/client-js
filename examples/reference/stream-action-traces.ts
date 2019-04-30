import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK, prettifyJson } from "../config"
import { createDfuseClient, InboundMessage, InboundMessageType, waitFor } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = await client.streamActionTraces(
    {
      accounts: "eosio.token|thekarmadapp|trustdicewin",
      with_inline_traces: true,
      with_dbops: true,
      with_dtrxops: true,
      with_ramops: true
    },
    (message: InboundMessage<any>) => {
      if (message.type !== InboundMessageType.ACTION_TRACE) {
        return
      }

      console.log(prettifyJson(message.data))
    }
  )

  await waitFor(15000)
  await stream.close()
}

runMain(main)
