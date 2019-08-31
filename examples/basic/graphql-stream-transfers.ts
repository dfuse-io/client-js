import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, waitFor, Stream } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = (await client.graphql<any>(streamTransfer, {
    onMessage: (message) => {
      if (message.type === "data") {
        const actions = message.data.searchTransactionsForward.trace.matchingActions

        actions.forEach(({ json }: any) => {
          const { from, to, quantity, memo } = json
          console.log(`Transfer [${from} -> ${to}, ${quantity}] (${memo})`)
        })
      }
    }
  })) as Stream

  await waitFor(5000)
  await stream.close()

  client.release()
}

const streamTransfer = `
  subscription {
    searchTransactionsForward(query: "receiver:eosio.token action:transfer") {
      trace {
        matchingActions {
          json
        }
      }
    }
  }
`

runMain(main)
