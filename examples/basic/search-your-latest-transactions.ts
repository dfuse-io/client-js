import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, SearchTransactionRow } from "@dfuse/client"

const account = "eoscanadacom"

async function main() {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  try {
    const response = await client.searchTransactions(`auth:${account} status:executed`, {
      limit: 10,
      sort: "desc"
    })

    console.log()
    console.log(`Your latest 10 transactions`)

    if (!response.transactions || response.transactions.length <= 0) {
      console.log("Oups nothing found")
      return
    }

    const transactions = response.transactions || []
    transactions.forEach((result: SearchTransactionRow) => {
      console.log(
        `- ${buildEosqLink(result.lifecycle.id)} (Block #${
          result.lifecycle.execution_trace!.block_num
        })`
      )
    })
    console.log()
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

function buildEosqLink(transactionId: string) {
  let suffix = ""
  if (["jungle", "kylin", "worbli"].includes(DFUSE_API_NETWORK)) {
    suffix = `.${DFUSE_API_NETWORK}`
  }

  return `https://${suffix}eosq.app/tx/${transactionId}`
}

runMain(main)
