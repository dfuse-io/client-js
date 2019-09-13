import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, waitFor, Stream } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = await client.graphql(streamTransfer, (message, marker) => {
    if (message.type === "data") {
      const data = message.data.searchTransactionsForward
      const actions = data.trace.matchingActions

      actions.forEach(({ json }: any) => {
        const { from, to, quantity, memo } = json
        console.log(`Transfer [${from} -> ${to}, ${quantity}] (${memo})`)
      })

      marker.mark({ cursor: data.cursor })
    }
  })

  await waitFor(5000)
  await stream.close()

  client.release()
}

const streamTransfer = `
  subscription {
    searchTransactionsForward(query: "receiver:eosio.token action:transfer") {
      cursor
      trace {
        matchingActions {
          json
        }
      }
    }
  }
`

runMain(main)
