import { DFUSE_API_KEY, runMain, prettifyJson } from "../config"
import { createDfuseClient } from "@dfuse/client"
import gql from "graphql-tag"
import { print as printGraphqlDocument } from "graphql/language/printer"

/**
 * An example showing off usage of GraphQL Query or Mutation directly
 * using the @dfuse/client library without requiring to use Apollo.
 *
 * This example showcases usage of `gql` string template literal
 * that parses the GraphQL document before sending it to the server
 * so you are sure the syntax is correct. This feature depends on
 * package `graphql-tag` and `graphql` to be available. The actual
 * parsing and turning them into proper JSON can be performed
 * at compile time using the appropriate Webpack or Rollup loader.
 *
 * Those dependencies are totally optional, you can remove the
 * dependency and send you query directly by simply removing the
 * `gql` string template literal and replacing `printGraphqlDocument(searchTransferQuery)`
 * by `searchTransferQuery` in the example (and remove the imports).
 *
 * **Note** Only `Query` and `Mutation` document are supported this way,
 * for now as those pass through normal HTTP operation. The `Subscription`
 * though is a bit harder and must be handled by Apollo directly as even
 * if it passes through a WebSocket transport, there is a protocol implementation
 * over it to follow.
 */
async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: "mainnet.eth.dfuse.io"
  })

  try {
    const response = await client.apiRequest(
      "/graphql",
      "POST",
      {},
      { query: printGraphqlDocument(searchTransferQuery) }
    )

    console.log("GraphQL response", prettifyJson(response))
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

const searchTransferQuery = gql`
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
