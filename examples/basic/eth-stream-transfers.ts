import { DFUSE_API_KEY, runMain } from "../config"
import { createDfuseClient, waitFor } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: "mainnet.eth.dfuse.io"
  })

  const stream = await client.graphql(streamTransfer, (message) => {
    if (message.type === "data") {
      const { cursor, node } = message.data.searchTransactions
      console.log(`Transfer [${node.from} -> ${node.to}, ${node.value}]`)

      stream.mark({ cursor })
    }
  })

  await waitFor(5000)
  await stream.close()

  client.release()
}

const streamTransfer = `
  subscription {
    searchTransactions(query: "method:'transfer(address,uint256)'") {
      undo
      cursor
      node {
        hash from to value(encoding: ETHER)
      }
    }
  }
`

runMain(main)
