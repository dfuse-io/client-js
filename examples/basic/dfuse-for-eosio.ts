import { runMain } from "../config"
import { createDfuseClient, waitFor } from "@dfuse/client"

/**
 * This shows how to configure the `client-js` instance when working with
 * a locally dfuse instance running through `dfuseeos` binary using the
 * standard configuration.
 *
 * This example assumes you have dfuse for EOSIO running
 * (https://github.com/dfuse-io/dfuse-eosio#getting-started) using the standard
 * configuration.
 */
async function main(): Promise<void> {
  const client = createDfuseClient({
    network: "localhost:8080",
    authentication: false,
    secure: false,
  })

  const streamTransfer = `subscription($cursor: String!) {
    searchTransactionsForward(query: "receiver:eosio action:onblock", cursor: $cursor) {
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
        const {
          header: { timestamp: timeSlot, producer },
        } = json
        console.log(`Action [${producer} @ ${timeSlot}]`)
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
