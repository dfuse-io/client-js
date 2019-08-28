import { DFUSE_API_KEY, runMain, prettifyJson } from "../config"
import { createDfuseClient } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: "mainnet.eth.dfuse.io"
  })

  try {
    const response = await client.apiRequest("/graphql", "POST", {}, { query: searchTransferQuery })

    console.log("GraphQL response", prettifyJson(response))
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

const searchTransferQuery = `
  {
    searchTransactions(query: "method:\\"transfer(address,uint256)\\"", highBlockNum: -1) {
      cursor
      results {
        undo
        cursor
        trace {
          hash
          sender
          recipient
          value
        }
      }
    }
  }
`

runMain(main)
