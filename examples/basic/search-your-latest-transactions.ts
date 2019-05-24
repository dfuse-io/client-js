import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, SearchTransactionRow } from "@dfuse/client"

const account = "eoscanadacom"

async function main() {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  try {
    const response = await client.searchTransactions(`auth:${account}`, {
      limit: 10,
      sort: "desc"
    })

    console.log()
    console.log(`Your latest 10 transactions`)

    if (!response.transactions || response.transactions.length <= 0) {
      console.log("Oups nothing found")
      return
    }

    response.transactions.forEach((result: SearchTransactionRow) => {
      console.log("- " + buildEosqLink(result.lifecycle.id))
    })
    console.log()
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

function buildEosqLink(transactionId: string) {
  let suffix = ""
  if (DFUSE_API_NETWORK === "jungle" || DFUSE_API_NETWORK === "kylin") {
    suffix = `.${DFUSE_API_NETWORK}`
  }

  return `https://${suffix}eosq.app/tx/${transactionId}`
}

runMain(main)
