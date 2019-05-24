import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, SearchTransactionRow } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  try {
    const response = await client.searchTransactions("auth:eoscanadacom", {
      limit: 10
    })

    console.log(`Search transactions response`, prettifyJson(response))

    console.log()
    console.log(`Search transactions results (${response.transactions.length})`)
    response.transactions.forEach((result: SearchTransactionRow) => {
      const blockHeader = result.lifecycle.execution_block_header
      const blockNum = parseInt(blockHeader.previous.substring(0, 8), 16) + 1

      console.log(
        ` - ${result.lifecycle.id} [Actions ${result.action_idx.join(", ")}] (${blockNum} @ ${
          blockHeader.timestamp
        })`
      )
    }, response.transactions)

    if (response.cursor) {
      console.log("")
      console.log("Cursor: " + response.cursor)
    }
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

runMain(main)
