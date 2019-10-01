import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, waitFor } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const streamTransfer = `subscription($cursor: String!) {
    searchTransactionsForward(query: "receiver:eosio.token action:transfer", cursor: $cursor) {
      undo cursor
      trace {
        matchingActions { json }
      }
    }
  }`

  const stream = await client.graphql(streamTransfer, (message) => {
    if (message.type === "error") {
      console.log("An error occurred", message.errors, message.terminal)
    }

    if (message.type === "data") {
      const data = message.data.searchTransactionsForward
      const actions = data.trace.matchingActions

      actions.forEach(({ json }: any) => {
        const { from, to, quantity, memo } = json
        console.log(`Transfer [${from} -> ${to}, ${quantity}] (${memo})`)
      })

      stream.mark({ cursor: data.cursor })
    }

    if (message.type === "complete") {
      console.log("Stream completed")
    }
  })

  await waitFor(5000)
  await stream.close()

  client.release()
}

runMain(main)
