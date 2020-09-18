import { TransactionLifecycle } from "../types/transaction"
import { ActionTrace } from "../types/action-trace"
import { SearchTransactionRow } from "../types/search"

type WalkActionsState = {
  index: number
  actions: ActionTrace<unknown>[]
}

/**
 * This method flattens the nested action traces of a [[TransactionLifecycle]] into
 * a single flat list. The flat list indexes matches dfuse API action index
 * which is used within dfuse to identify particular action trace in
 * various situation (db ops, RAM ops, etc).
 *
 * The action index of a given action is obtained simply by doing a
 * deep-first traversal of the action traces structure incrementing
 * a counter at each step and binding the counter to the current traversed
 * action becoming the action's index.
 *
 * As an example of this method, assume the following transaction:
 *
 * ```
 * Transaction 123 {
 *   ExecutionTrace {
 *     ActionTraces: [
 *       ActionTrace(eosio.token/eosio.token:transfer) {
 *         InlineTraces: [
 *           ActionTrace(from/eosio.token:transfer) {
 *             InlineTraces: [
 *               ActionTrace(contractX/contractX:log)
 *             ]
 *           }
 *           ActionTrace(to/eosio.token:transfer) {
 *             InlineTraces: [
 *               ActionTrace(contractY/contractY:update)
 *             ]
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
 * ```
 *
 * This will results in the following flattened actions list being returned:
 *
 * ```
 * [
 *   ActionTrace(eosio.token/eosio.token:transfer),
 *   ActionTrace(from/eosio.token:transfer),
 *   ActionTrace(contractX/contractX:log),
 *   ActionTrace(to/eosio.token:transfer),
 *   ActionTrace(contractY/contractY:update),
 * ]
 * ```
 *
 * @param transaction The transaction lifecycle object to flatten action traces from.
 * @returns A flat list of action traces extracted from the transaction lifecycle for which each
 * index of the list represents the action's index concept of dfuse API.
 */
export function flattenActionTraces(transaction: TransactionLifecycle): ActionTrace<any>[] {
  if (!transaction.execution_trace) {
    return []
  }

  const state = {
    index: -1,
    actions: [],
  }

  transaction.execution_trace.action_traces.forEach((actionTrace) => {
    walkFlattenedActionTraces(actionTrace, state)
  })

  return state.actions
}

function walkFlattenedActionTraces(
  rootActionTrace: ActionTrace<any>,
  state: WalkActionsState
): void {
  state.index++
  state.actions.push(rootActionTrace)

  const childActionTraces = rootActionTrace.inline_traces || []

  childActionTraces.forEach((childActionTrace) => {
    walkFlattenedActionTraces(childActionTrace, state)
  })
}

/**
 * This method extracts the matchinf actions out of [[SearchTransactionRow]]
 * object.
 *
 * Using the search endpoint, you receives a [[SearchTransactionRow]] that
 * is simply a composite object containing an actual [[TransactionLifecycle]]
 * element as well as a list of action indexes which are the actual
 * ones that matched your query.
 *
 * A single transaction can contains a big amount of actions but usually,
 * only a subset of the actions in a transaction matches your search query.
 *
 * By using this method, you can easily extracts the matching actions
 * out of the [[SearchTransactionRow]] object.
 *
 * @param searchRow The search result row to extract matching action traces from.
 * @returns A flat list of action traces extracted from the search result row that matched
 * the query term(s).
 */
export function matchingActionTraces(searchRow: SearchTransactionRow): ActionTrace<any>[] {
  if (!searchRow.lifecycle.execution_trace) {
    return []
  }

  const matchingActionIndexes = searchRow.action_idx
  const state = {
    index: -1,
    actions: [],
  }

  searchRow.lifecycle.execution_trace.action_traces.forEach((actionTrace) => {
    walkMatchingActionTraces(actionTrace, matchingActionIndexes, state)
  })

  return state.actions
}

function walkMatchingActionTraces(
  rootActionTrace: ActionTrace<any>,
  matchingActionIndexes: number[],
  state: WalkActionsState
): void {
  state.index++
  if (matchingActionIndexes.includes(state.index)) {
    state.actions.push(rootActionTrace)
  }

  const childActionTraces = rootActionTrace.inline_traces || []

  childActionTraces.forEach((childActionTrace) => {
    walkMatchingActionTraces(childActionTrace, matchingActionIndexes, state)
  })
}
