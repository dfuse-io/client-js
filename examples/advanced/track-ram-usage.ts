import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  TransactionLifecycle,
  SearchTransactionRow,
  RAMOp
} from "@dfuse/eosws-js"

async function main() {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  const account = "joshkauffman"
  const contract = "eosio.token"

  try {
    const response = await client.searchTransactions(
      `(ram.released:${account} OR ram.consumed:${account}) receiver:${contract}`,
      {
        limit: 100
      }
    )

    const includedRAMOp = (ramOp: RAMOp) =>
      ramOp.payer === account && !ramOp.op.startsWith("deferred")
    const matchingTransactions = findMatchingTransaction(response.transactions, includedRAMOp)

    console.log()
    console.log(`RAM Running Total (${matchingTransactions.length} transactions included)`)

    let runningTotal = 0
    matchingTransactions.forEach((result: SearchTransactionRow) => {
      console.log(` - https://eosq.app/tx/${result.lifecycle.id}`)

      result.lifecycle.ramops!.forEach((ramOp: RAMOp) => {
        if (includedRAMOp(ramOp)) {
          runningTotal += ramOp.delta
          console.log(`  * ${ramOp.op} ${ramOp.delta} (${runningTotal})`)
        }
      })

      console.log()
    })
  } catch (error) {
    console.log("An error occurred", prettifyJson(error))
  }
}

function findMatchingTransaction(
  rows: SearchTransactionRow[],
  includedRAMOp: (op: RAMOp) => boolean
) {
  return rows.filter((row: SearchTransactionRow) => {
    if (row.lifecycle.ramops!.some(includedRAMOp)) {
      return true
    }
  })
}

runMain(main)
