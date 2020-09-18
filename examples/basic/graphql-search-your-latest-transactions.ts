import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient } from "@dfuse/client"

const account = "eoscanadacom"

async function main(): Promise<void> {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  const searchTransactions = `query ($limit: Int64!) {
    searchTransactionsBackward(query: "auth:${account}", limit: $limit) {
      results {
        block { num }
        trace { id matchingActions { json } }
      }
    }
  }`

  try {
    const response = await client.graphql(searchTransactions, {
      variables: { limit: 10 },
    })

    console.log()
    console.log(`Your latest 10 transactions`)

    const results = response.data.searchTransactionsBackward.results || []
    if (results.length <= 0) {
      console.log("Oups nothing found")
      return
    }

    results.forEach((result: any) => {
      console.log(`- ${buildEosqLink(result.trace.id)} (Block #${result.block.num})`)
    })
    console.log()
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

function buildEosqLink(transactionId: string): string {
  let suffix = ""
  if (["jungle", "kylin", "worbli"].includes(DFUSE_API_NETWORK)) {
    suffix = `.${DFUSE_API_NETWORK}`
  }

  return `https://${suffix}eosq.app/tx/${transactionId}`
}

runMain(main)
