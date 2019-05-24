import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  SearchTransactionRow,
  RamOp,
  DfuseClient,
  flattenActionTraces,
  waitFor
} from "@dfuse/client"

const account = "joshkauffman"
const resultPerPage = 50
const maxResults = 500

/**
 * In this example, we showcase how to search cursor to paginate through
 * the multiple page of search results.
 *
 * We also show at the same time how to work with the search result rows
 * to obtain only the matching actions of the transaction instead of dealing
 * with all the actions in the transaction.
 *
 * This is usually what most people expects to have from the API (the
 * actions of the transaction that matched the search criteria).
 */
async function main() {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })
  const query = `(ram.released:${account} OR ram.consumed:${account})`

  try {
    let resultCount = 0
    let runningTotal = 0
    let cursor = ""
    let pageCount = 0

    while (resultCount <= maxResults) {
      const page = await fetchPage(client, query, cursor)
      pageCount++

      resultCount += page.transactions.length
      cursor = page.cursor

      page.transactions.forEach((result: SearchTransactionRow) => {
        console.log(`- https://${inferEosqHost()}/tx/${result.lifecycle.id}`)

        /**
         * A transaction is composed of a deep trace of action traces
         * representing the execution of the various transaction's actions.
         *
         * In dfuse API, there is sometimes the needs to assiocate some data
         * with a particular action trace, a database operation for example
         * backlink through an `action_idx` property to the actual action
         * trace that generates this operation.
         *
         * The `action_idx` is not easily to work with at the transaction
         * level since the dfuse API consumer needs to perform a deep-first
         * traversal of the execution tree to determine the actual action.
         *
         * To ease that process, the helper `flattenActionTraces` can be used
         * to get a flatten list of action traces where each index of the list
         * map to the correct `action_idx` value.
         *
         * This can than later be used to easily find the action representing
         * a given `action_idx` value. See below for usage with RAM op.
         */
        const flattenedActionTraces = flattenActionTraces(result.lifecycle)

        // /**
        //  * Using dfuse Search API, you received the full transaction as a result,
        //  * however, in this transaction, while there can be 10 different actions,
        //  * maybe only 2 out of the 10 actually matches the query.
        //  *
        //  * The `matchingActionTraces` helper can easily be used to extract
        //  * only the matching action traces out of a `SearchTransactionRow`
        //  * result.
        //  */
        // const actionTraces = matchingActionTraces(result)

        result.lifecycle.ramops!.forEach((ramOp: RamOp) => {
          // FIXME: Right logic for RAM op!

          runningTotal += ramOp.delta

          const ramText = `${ramOp.op} ${ramOp.delta}`
          const action = flattenedActionTraces[ramOp.action_idx]
          const actionText = `${action.receipt.receiver}/${action.act.account}:${action.act.name}`

          console.log(` * ${ramText} @ ${actionText} (${runningTotal})`)
        })

        console.log()
      })

      /**
       * To determine end of current pages through dfuse Search API one
       * must conditionally check either if the cursor is empty or
       * if the search result count of this request is lower than our
       * expected results per page.
       *
       * **Caveat** In an ascending search, the dfuse Search stops at
       * at current time Irreversible Block or Head Block but more blocks
       * might come in the future. This means that event if there is less
       * results than expected per page, future blocks might add more
       * results hence the `cursor` being non empty.
       *
       * **Note** Doing a descending search however will yield an empty
       * string cursor at some point because you will reach the Genesis
       * Block of the chain (Block #1) at some point.
       */
      if (page.cursor === "" || page.transactions.length < resultPerPage) {
        // No more pages, stop page fetch
        break
      }

      console.log(`RAM Running Total (${resultCount} transactions included) is ${runningTotal}`)
      console.log(`Fetching next page (#${pageCount + 1}) in 5s ...`)
      await waitFor(5000)
    }

    console.log(`Running total is ${runningTotal}`)
    console.log(`Completed after reading ${pageCount} page(s)`)
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

type Page = {
  cursor: string
  transactions: SearchTransactionRow[]
}

/**
 * Fetches a single page of results for a particular query, starting
 * back at `cursor` if present and returning the matching actions out
 * of our results.
 */
async function fetchPage(client: DfuseClient, query: string, cursor?: string): Promise<Page> {
  const searchResult = await client.searchTransactions(query, {
    limit: resultPerPage,
    cursor
  })

  return {
    cursor: searchResult.cursor,
    transactions: searchResult.transactions || []
  }
}

function inferEosqHost() {
  if (DFUSE_API_NETWORK === "mainnet") {
    return "eosq.app"
  }

  if (["jungle", "kylin"].includes(DFUSE_API_NETWORK)) {
    return `${DFUSE_API_NETWORK}.eosq.app`
  }

  return `${DFUSE_API_NETWORK}`
}

runMain(main)
