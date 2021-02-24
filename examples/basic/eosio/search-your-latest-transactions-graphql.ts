import { DFUSE_API_KEY, DFUSE_API_NETWORK, prettifyJson } from "../../config"
import { createDfuseClient } from "@dfuse/client"

async function main(): Promise<void> {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  const operation = `subscription($cursor: String!) {
    searchTransactionsBackward(query:"receiver:consortiumlv action:xschedule db.table:kysimused" lowBlockNum: -5000000, highBlockNum: -1, cursor: $cursor) {
      cursor
      trace { id matchingActions { json, dbOps(code: "consortiumlv"){operation, oldJSON {object error}} } }
    }
  }`

  const stream = await client.graphql(operation, (message) => {
    if (message.type === "data") {
      const {
        trace: { matchingActions },
      } = message.data.searchTransactionsBackward
      matchingActions.forEach((action: any) => {
        console.log(prettifyJson(action.dbOps))
      })
    }

    if (message.type === "error") {
      console.log("An error occurred", message.errors, message.terminal)
    }

    if (message.type === "complete") {
      console.log("Completed")
    }
  })

  await stream.join()
  await client.release()
}

main().catch((error) => console.log("Unexpected error", error))
