import { DFUSE_API_KEY } from "../../config"
import { createDfuseClient, waitFor } from "@dfuse/client"

// The system can easily handles thousands of addresses, so there is no fear to have a big lists
const addresses = ["0x7a250d5630b4cf539739df2c5dacb4c659f2488d"]

async function main(): Promise<void> {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: "mainnet.eth.dfuse.io",
  })

  // TBC Add showcase of SPECULATIVELY_EXECUTED, and CONFIRMED transition
  const streamTransaction = `
    subscription($addresses: [String!]!) {
      transactions(addresses: $addresses, matchAnyOf: [TO, FROM, ERC20_TO, ERC20_FROM], maxConfirmations: 20) {
        hash currentState transitionName
        transition {
          ... on TrxTransitionInit { transaction { ...Transaction } trace {...Trace } replacedById confirmations }
          ... on TrxTransitionPooled { transaction { ...Transaction } }
          ... on TrxTransitionReplaced { replacedById }
          ... on TrxTransitionMined { trace {...Trace } }
          ... on TrxTransitionForked { transaction { ...Transaction }}
        }
      }
    }

    fragment Transaction on Transaction {
      hash from to value(encoding:ETHER) nonce gasLimit gasPrice(encoding:WEI) inputData
    }

    fragment Trace on TransactionTrace {
      hash status from to value(encoding:ETHER) nonce gasUsed gasLimit gasPrice(encoding:WEI) matchingCalls { from to value(encoding:ETHER) callType } inputData block { hash number header { timestamp parentHash } }
    }
  `

  const stream = await client.graphql(
    streamTransaction,
    (message) => {
      if (message.type === "data") {
        const { hash, transitionName, transition, currentState } = message.data.transactions
        let confirmed = ""
        if (transitionName === "INIT") {
          confirmed = `, confirmed ${transition.confirmations}`
        }

        // The hash value contains the transaction hash in possible transition, a stream cannot be received without having the hash
        log(
          `Dealing with transaction ${hash} (transition ${transitionName}, to state ${currentState}${confirmed})`
        )

        // There is no cursor on this stream yet, that means greater care must be taken from the consumer
        // perspective as upon reconnection, you receive back transactions that you already seen. As such,
        // some de-dupe mechanisms must be put in place on the consumer side.
        //
        // Further, the actual returned a reconnection is a bit different based on wheter it's our backend
        // that restarted or if it was only a network problem between you and our backend.
        //
        // If the disconnection happens and our backend never restarted in-between, you will received every
        // pooled and mined transactions the backend knowns about at time of reconnection (of course only
        // those matching the filters provided).
        //
        // However, if our backend restarted, you will receive only every mined transactions (we keep all
        // transactions mined in the last 250 blocks).
        //
        // While the stream is guaranteed to never miss a transaction (if you reconnect within 250 blocks),
        // there is a potential of not seeing the transition from "unknown" to "pending" state.

        // Transaction that was already in the backend state when connection for the first or after
        // a disconnection. Use the `currentState` variable to determine where it is right now.
        //
        // @example {"hash": "0x...", "currentState": "PENDING", "transitionName": "INIT", "transition":{"transaction":{"hash": "0x....", ...Transaction's fields },"trace":{"hash": "0x....", ...TransactionTrace's fields }}}}
        if (transitionName === "INIT") {
          if (currentState === "REPLACED") {
            // The transaction was replaced by another one and field `transition.replacedById` tells us which transaction
            json(JSON.stringify({ type: "replaced", body: transition.replacedById }))
            return
          }

          if (currentState === "PENDING") {
            // The transaction is in the mempool, this might be a transaction your already received in the past or a new one
            json(JSON.stringify({ type: "pooled", body: transition.transaction }))
            return
          }

          if (currentState === "IN_BLOCK") {
            // The transaction is inside a block, this might be a transaction trace your already received in the past or a new one
            json(JSON.stringify({ type: "mined", body: transition.trace }))
            return
          }

          stream.close({
            error: new Error(
              `Invalid state ${currentState}, only REPLACED, PENDING and IN_BLOCK should be returned, it's an error if this happens`
            ),
          })
          return
        }

        // Transaction has been added to the mempool transitionning from UNKNOWN to PENDING state.
        //
        // @example {"hash": "0x...", "currentState": "PENDING", "transitionName": "POOLED", "transition":{"transaction":{"hash": "0x....", ...Transaction's fields }}}
        if (transitionName === "POOLED") {
          json(JSON.stringify({ type: "pooled", body: transition.transaction }))
          return
        }

        // Transaction that was in the mempool has been replaced by a new one (gas bump) transitionning from PENDING to REPLACED state.
        //
        // @example {"hash": "0x...", "currentState": "REPLACED", "transitionName": "REPLACED", "transition":{ "replacedById": "0xabc..."}}
        if (transitionName === "REPLACED") {
          json(JSON.stringify({ type: "replaced", body: transition.replacedById }))
          return
        }

        // Transaction has been picked from mempool and is now included in a non-confirmed
        // block transitionning from PENDING to IN_BLOCK state.
        //
        // @example {"hash": "0x...", "currentState": "IN_BLOCK", "transitionName": "MINED", "transition":{"trace":{"hash": "0x....", ...TransactionTrace's fields }}}
        if (transitionName === "MINED") {
          json(JSON.stringify({ type: "mined", body: transition.trace }))
          return
        }

        // Transaction was in block that is now forked and not part of the active chain transitionning from IN_BLOCK to FORKED state.
        //
        // @example {"hash": "0x...", "currentState": "PENDING", "transitionName": "FORKED", "transition":{"trace":{"hash": "0x....", ...TransactionTrace's fields }}}
        if (transitionName === "FORKED") {
          json(JSON.stringify({ type: "forked", body: transition.trace }))
          return
        }

        stream.close({
          error: new Error(
            `Invalid transition ${transitionName}, we did not request it, it's an error if this happens`
          ),
        })
        return
      }

      if (message.type === "error") {
        log("An error occurred", message.errors, message.terminal)
        return
      }

      if (message.type === "complete") {
        stream.close({
          error: new Error(
            "Invalid state, stream should never complete, it's an error if this happens"
          ),
        })
        return
      }
    },
    {
      variables: { addresses },
    }
  )

  await waitFor(30000)
  await stream.close()

  log("Completing stream after 30s")
  client.release()
}

// The log is going to emit to Stderr (hence usage of `console.error`) so that output
// JSON line content can be parsed through `jq`.
function log(...args: any[]): void {
  console.error(...args)
}

function json(input: unknown): void {
  console.log(JSON.stringify(input))
}

main().catch((error) => log("Unexpected error", error))
