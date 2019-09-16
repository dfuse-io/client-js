import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK, prettifyJson } from "../config"
import {
  createDfuseClient,
  waitFor,
  Stream,
  DfuseClient,
  GraphqlStreamMessage
} from "@dfuse/client"

/**
 * In this example, we will showcase how to implement bulletproof
 * data integrity while using the dfuse GraphQL Stream by ensuring
 * you never miss a single beat.
 *
 * This pattern can be used when you want to process messages only
 * once, while still ensuring you correctly receive all the blocks,
 * transactions and actions you want to process.
 *
 * We go through an example of how to easily mark the stream progress
 * and how the marker is then used when the socket reconnects to
 * restart the stream at the exact location you need.
 *
 * In the example we will implement an action persistence storer,
 * having our code restart at the exact correct place a commit had
 * occurred.
 */
async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
    graphqlStreamClientOptions: {
      socketOptions: {
        reconnectDelayInMs: 250
      }
    }
  })

  const engine = new Engine(client)
  await engine.start()

  await waitFor(50000)
  await engine.stop()

  client.release()
}

type Message<T> = {
  searchTransactionsForward: {
    undo: boolean
    cursor: string
    block: {
      id: string
      num: number
    }
    trace?: {
      matchingActions: {
        json: T
      }[]
    }
  }
}

type KarmaTransfer = {
  from: string
  to: string
  quantity: string
  memo: string
}

class Engine {
  private client: DfuseClient
  private stream?: Stream

  private pendingActions: KarmaTransfer[] = []
  private committedActions: KarmaTransfer[] = []

  constructor(client: DfuseClient) {
    this.client = client
  }

  public async start() {
    console.log("Engine starting")

    // Here we use the `liveMarkerInterval` which with give us a notification each
    // 10 blocks. This is useful to update the cursor when your query is low traffic.
    // Otherwise, you could restart thousands of blocks behing tip of chain. See
    // `onProgress` for further details about cursor saving on this notification.
    const graphqlDocument = `
      subscription ($cursor: String!) {
        searchTransactionsForward(query: "receiver:therealkarma action:transfer", cursor: $cursor, liveMarkerInterval: 10) {
          undo
          cursor
          block {
            id
            num
          }
          trace {
            matchingActions {
              json
            }
          }
        }
      }
    `

    this.stream = await this.client.graphql(
      graphqlDocument,
      (message: GraphqlStreamMessage) => {
        if (message.type === "data") {
          this.onResult(message.data as Message<KarmaTransfer>)
        }

        if (message.type === "error") {
          this.onError(message.errors)
        }
      },
      {
        variables: {
          // In a real-word production code
          cursor: ""
        }
      }
    )

    this.stream.onPostRestart = () => {
      console.log()
      console.log(
        "<============= Stream has reconnected to the socket correctly (at latest `mark()`) =============>"
      )
      console.log()

      // Upon a reconnection, we need to clear previously accumulated actions
      this.flushPending()
    }

    console.log("Stream connected, ready to receive messages")
  }

  private onProgress = (blockId: string, blockNum: number, cursor: string) => {
    console.log(`Live marker received @ ${printBlock(blockId, blockNum)}`)

    // We commit also on progress. The reasoning is that we have now move 10 blocks
    // forward through the change, and we received a corresponding cursor. In the
    // commit phase, we will mark the stream with `stream.mark({ cursor })` which
    // we ensure that on reconnection, the cursor will start back right at the
    // correct progress cursor, this cost effective and improves slightly the
    // reconnection performance as we start closer to the tip of the chain.
    this.commit(cursor)
  }

  private onResult = (message: Message<KarmaTransfer>) => {
    const data = message.searchTransactionsForward
    const { id: blockId, num: blockNum } = data.block

    // A message without the trace object being set means we deal with a live marker progress message
    if (!data.trace) {
      this.onProgress(blockId, blockNum, data.cursor)
      return
    }

    data.trace.matchingActions.forEach((action) => {
      const { from, to, quantity } = action.json

      console.log(
        `Pending transfer [${from} -> ${to} ${quantity}] @ ${printBlock(blockId, blockNum)}`
      )
      this.pendingActions.push(action.json)
    })

    console.log("Comitting changes after transaction")
    this.commit(data.cursor)
  }

  private onError = (errors: Error[]) => {
    console.log("Received an 'error' message", prettifyJson(errors))
  }

  private commit(cursor: string) {
    if (this.pendingActions.length > 0) {
      console.log(`Committing all actions up to cursor ${cursor}`)

      // Here, in your production code, action would be saved in a database, as well as error handling
      this.pendingActions.forEach((action) => this.committedActions.push(action))
      this.pendingActions = []
    }

    /**
     * This is one of the most important calls of the example. By marking the stream
     * at the right block, upon restarting, the stream will automatically start back
     * at this block ensuring you never miss a single action.
     */
    console.log(`Marking stream up to cursor`)
    this.ensureStream().mark({ cursor })

    /**
     * In a real-word production code, you would also need to persist the
     * `cursor` value to ensure that upon a process restart, you start back from
     * this exact value.
     */

    console.log("")
  }

  /**
   * When the stream reconnects, we must flush all of the current pending transactions
   * as the stream restarts at our last marked block, inclusively.
   *
   * Since we mark after commit, anything currently in pending was not committed.
   * As such, let's flush all pending actions. The dfuse GraphQL Stream API will stream them back.
   */
  public async flushPending() {
    console.log("Flushing pending action(s) due to refresh")
    this.pendingActions = []
  }

  public async stop() {
    await this.ensureStream().close()

    console.log("Committed actions")
    this.committedActions.forEach((action) => {
      const { from, to, quantity } = action
      console.log(`- Commit transfer [${from} -> ${to} ${quantity}]`)
    })
  }

  private ensureStream(): Stream {
    if (this.stream) {
      return this.stream
    }

    throw new Error("Stream should be set at this runtime execution point")
  }
}

function printBlock(blockId: string, blockNum: number): string {
  return `${blockId.slice(0, 8)}...${blockId.slice(-8)} (${blockNum})`
}

runMain(main)
