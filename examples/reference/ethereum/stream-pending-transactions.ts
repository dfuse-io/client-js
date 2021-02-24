import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../../config"
import { createDfuseClient, waitFor } from "@dfuse/client"
import WebSocketClient from "ws"

async function main(): Promise<void> {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
    graphqlStreamClientOptions: {
      socketOptions: {
        webSocketFactory: (url) => webSocketFactory(url, ["graphql-ws"]),
      },
    },
    streamClientOptions: {
      socketOptions: {
        webSocketFactory: (url) => webSocketFactory(url),
      },
    },
  })

  const addresses = loadAddresses("./addresses.json")

  const streamPendingTrxs = `subscription ($addresses: [String!]!, $fields: FILTER_FIELD!) {
    _alphaPendingTransactions(filterAddresses: $addresses, filterField: $fields) {
      hash from to gasLimit gasPrice(encoding: ETHER) value(encoding: ETHER)
    }
  }`

  const stream = await client.graphql(
    streamPendingTrxs,
    (message) => {
      if (message.type === "error") {
        console.log("An error occurred", message.errors, message.terminal)
      }

      if (message.type === "data") {
        const data = message.data._alphaPendingTransactions
        const { hash, from, to, value, gasLimit } = data

        console.log(`Pending [${from} -> ${to}, ${value} ETH, Gas ${gasLimit}] (${hash})`)
      }

      if (message.type === "complete") {
        console.log("Stream completed")
      }
    },
    {
      variables: {
        // addresses: ["0xA4e5961B58DBE487639929643dCB1Dc3848dAF5E"],
        addresses: addresses(),
        fields: "FROM_OR_TO",
      },
    }
  )

  await waitFor(10000)
  await stream.close()

  client.release()
}

runMain(main)

async function webSocketFactory(url: string, protocols: string[] = []): Promise<WebSocketClient> {
  console.log("Creating new client with updated max payload")
  return new WebSocketClient(url, protocols, {
    maxPayload: 45 * 1024 * 1024, // 45 Mib
  })
}

async function loadAddresses(file: string): Promise<string[]> {
  return []
}
