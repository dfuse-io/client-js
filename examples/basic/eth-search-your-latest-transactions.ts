import { DFUSE_API_KEY, runMain } from "../config"
import { createDfuseClient } from "@dfuse/client"

const address = "0x09aC08243f91A0dA89995F9B7af96Ef985aA5807"

async function main(): Promise<void> {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: "mainnet.eth.dfuse.io" })

  try {
    const searchTransactions = `query ($limit: Int64!) {
      searchTransactions(indexName: CALLS, query: "signer:${address}", limit: $limit, sort: DESC) {
        edges {
          node { hash block { number } }
        }
      }
    }`

    const response = await client.graphql(searchTransactions, {
      variables: { limit: "10" },
    })

    if (response.errors) {
      throw response.errors
    }

    console.log()
    console.log(`Your latest 10 transactions`)

    const edges = response.data.searchTransactions.edges || []
    if (edges.length <= 0) {
      console.log("Oups nothing found")
      return
    }

    edges.forEach(({ node }: any) => {
      console.log(`- ${buildEthqLink(node.hash)} (Block #${node.block.number})`)
    })
    console.log()
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

function buildEthqLink(transactionId: string): string {
  return `https://ethq.app/tx/${transactionId}`
}

runMain(main)
