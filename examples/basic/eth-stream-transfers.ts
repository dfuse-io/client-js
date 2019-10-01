import { DFUSE_API_KEY, runMain } from "../config"
import { createDfuseClient, waitFor } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: "mainnet.eth.dfuse.io"
  })

  const streamTransfer = `subscription($cursor: String) {
    searchTransactions(query: "method:'transfer(address,uint256)'", cursor: $cursor) {
      undo cursor
      node { hash from to value(encoding: ETHER) }
    }
  }`

  const stream = await client.graphql(streamTransfer, (message) => {
    if (message.type === "error") {
      console.log("An error occurred", message.errors, message.terminal)
    }

    if (message.type === "data") {
      const { cursor, node } = message.data.searchTransactions
      console.log(`Transfer [${node.from} -> ${node.to}, ${node.value}]`)

      stream.mark({ cursor })
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
