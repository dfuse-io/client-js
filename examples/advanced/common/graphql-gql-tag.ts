import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../../config"
import { createDfuseClient, GraphqlResponse } from "@dfuse/client"
import gql from "graphql-tag"
import { print as printGraphqlDocument } from "graphql/language/printer"

/**
 * This example showcases usage of `gql` string template literal
 * that parses the GraphQL document before sending it to the server
 * so you are sure the syntax is correct. This feature depends on
 * package `graphql-tag` and `graphql` to be available. The actual
 * parsing and turning them into proper JSON can be performed
 * at compile time using the appropriate Webpack or Rollup loader.
 *
 * Those dependencies are totally optional, check out the `examples/basic/gragpql-search-your-latest-transactions.ts`
 * file for an example that does not use those depencendies.
 */
type Message = {
  searchTransactionsBackward: {
    results: {
      block: {
        num: number
      }
      trace: {
        id: string
        matchingActions: {
          json: any
        }[]
      }
    }[]
  }
}

async function main(): Promise<void> {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
  })

  try {
    const response = (await client.graphql(printGraphqlDocument(searchTransferQuery), {
      variables: { limit: 10 },
    })) as GraphqlResponse<Message>

    console.log(prettifyJson(response))
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

const searchTransferQuery = gql`
  query($limit: Int64!) {
    searchTransactionsBackward(query: "receiver:eosio.token action:transfer", limit: $limit) {
      results {
        block {
          num
        }
        trace {
          id
          matchingActions {
            json
          }
        }
      }
    }
  }
`

runMain(main)
