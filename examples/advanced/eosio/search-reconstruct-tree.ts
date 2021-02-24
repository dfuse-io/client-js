import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK, prettifyJson } from "../../config"
import { createDfuseClient } from "@dfuse/client"

/**
 * This example shows how you can reconstruct the EOSIO execution tree
 * when using the dfuse GraphQL Search endpoint.
 *
 * You will be using `executedActions`, `closestUnnotifiedAncestorAction`
 * and the `seq` field. The `executedActions` gives the flat list ordered
 * by execution order. The `closestUnnotifiedAncestorAction` gives the
 * execution parent of the action and finally, the `seq` acts as an id
 * for each action so you can map the children to its parent easily.
 *
 * The algorithm is to simply loop over all executed actions, and add it
 * to its parent if `closestUnnotifiedAncestorAction` is present or as
 * a top level actions if not.
 *
 * The example below show the actual implementation of the algorithm
 * outlined above.
 */
async function main(): Promise<void> {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  const operation = `{
    searchTransactionsBackward(query: "action:bet account:diceproxy.bg", limit: 1, lowBlockNum: 78820587, highBlockNum: 78820589) {
      results {
        trace {
          id
          executedActions {
            seq
            receiver
            account
            name
            isNotify
            isMatchingQuery
            closestUnnotifiedAncestorAction {
              seq
            }
          }
        }
      }
    }
  }`

  try {
    const response = await client.graphql(operation)
    const results = response.data.searchTransactionsBackward.results || []
    if (results.length <= 0) {
      return
    }

    const trace = results[0].trace
    const idToActionMap: Record<string, any> = {}
    const topLevelActions: any[] = []

    trace.executedActions.forEach((action: any) => {
      idToActionMap[action.seq] = action
      if (action.closestUnnotifiedAncestorAction) {
        const parentAction = idToActionMap[action.closestUnnotifiedAncestorAction.seq]
        if (!parentAction.inline_traces) {
          parentAction.inline_traces = []
        }

        parentAction.inline_traces.push(action)
      } else {
        topLevelActions.push(action)
      }

      delete action.seq
      delete action.closestUnnotifiedAncestorAction
    })

    console.log(prettifyJson(topLevelActions))
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

runMain(main)
