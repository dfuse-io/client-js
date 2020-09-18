import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../../config"
import { createDfuseClient, waitFor } from "@dfuse/client"

async function main(): Promise<void> {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
  })

  const streamTransfer = `subscription {
    _alphaPendingTransactions(filterField:FROM_OR_TO, filterAddresses:["0xAbeB4fdC93C831Db19Fd029BE6A08f794E0d9020"],
    ) {
      hash from to value(encoding:ETHER) gasLimit
    }
  }`

  const stream = await client.graphql(streamTransfer, (message) => {
    if (message.type === "error") {
      console.log("An error occurred", message.errors, message.terminal)
    }

    if (message.type === "data") {
      const data = message.data._alphaPendingTransactions
      const { hash, from, to, value, gasLimit } = data

      console.log(`Pending [${from} -> ${to}, ${value} ETH, Gas ${gasLimit}] (${hash})`)
    }

    if (message.type === "complete") {
      console.log("Stream completed")
    }
  })

  await waitFor(10000)
  await stream.close()

  client.release()
}

runMain(main)
