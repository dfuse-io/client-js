import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  waitFor,
  Stream,
  DfuseClient,
  dynamicMessageDispatcher,
  ProgressInboundMessage,
  ActionTraceInboundMessage,
  Action
} from "@dfuse/client"

/**
 * In this example, we will showcase how to navigate micro-forks
 * by correclty processing the new/undo/redo steps ensuring to have
 * up-to-date data against the current longuest active chain on
 * the network.
 *
 * Upon new data, we will commit a
 *
 * We will show and example how to easily mark the stream progress
 * and how the marker is then used when the socket re-connects to
 * restart the stream at the exact location you need.
 *
 * In the example. we will implement an action persistence storer
 * showing our to restart at the exact correct place a commit had
 * occurred.
 *
 *
 * @see https://docs.dfuse.io/#websocket-based-api-never-missing-a-beat
 */
async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
    streamClientOptions: {
      socketOptions: {
        onError(error) {
          console.log("An error occurred", error)
        },
        onReconnect() {
          console.log()
          console.log("<============= Stream as re-connected to socket correctly =============>")
          console.log()

          // Upon a re-connection, we need to clear previously accumulated actions
          engine.flushPending()
        }
      }
    }
  })

  const engine = new Engine(client)
  await engine.start()

  await waitFor(50000)
  await engine.stop()
}

type KarmaGlobalRow = {
  power_pool: string
  total_power: string
  last_filled_time: number
}

class Engine {
  private client: DfuseClient
  private stream?: Stream

  private globalTable?: string

  private lastCommittedBlockNum: number = 0

  constructor(client: DfuseClient) {
    this.client = client
  }

  public async start() {
    const dispatcher = dynamicMessageDispatcher({
      listening: this.onListening,
      table_delta: this.onAction,
      progress: this.onProgress
    })

    console.log("Engine starting")
    this.stream = await this.client.streamActionTraces(
      {
        accounts: "therealkarma",
        action_names: "transfer"
      },
      dispatcher,
      {
        // You can use the `with_progress` to be sure to commit
        // actions at least each 10 blocks. This is useful if your stream
        // is low traffic so you don't need to wait until next
        // action to commit all changes.
        with_progress: 10
      }
    )

    console.log("Stream connected, ready to receive messages")
  }

  public async stop() {
    await this.ensureStream().close()

    console.log("Committed actions")
    this.committedActions.forEach((action) => {
      const { from, to, quantity } = action.data
      console.log(`- Commit transfer [${from} -> ${to} ${quantity}]`)
    })
  }

  /**
   * When the stream re-connects, we must flush all our current pending transactions
   * as the stream re-starts at our last marked block, inclusive.
   *
   * Since we mark after commit, anything currently in pending was not committed,
   * hence let's flush all pending actions, dfuse Stream will stream them back.
   */
  public async flushPending() {
    console.log("Flushing pending action(s) due to refresh")
    this.pendingActions = []
  }

  private onListening = () => {
    console.log("Stream is now listening for action(s)")
  }

  private onProgress = (message: ProgressInboundMessage) => {
    const { block_id, block_num } = message.data

    /**
     * Once a progress message is seen, it means we've seen all messages for
     * block prior it, so le'ts commit until this point.
     */
    console.log()
    console.log("Committing changes due to seeing a message from a progress message")
    this.commit(block_id, block_num)
  }

  private onAction = (message: ActionTraceInboundMessage<KarmaTransfer>) => {
    /**
     * Once a message from a block ahead of last committed block is seen,
     * commit all changes up to this point.
     */
    const { block_id, block_num } = message.data
    if (block_num > this.lastCommittedBlockNum) {
      console.log()
      console.log(
        "Comitting changes due to seeing a message from a block ahead of our last committed block"
      )
      this.commit(block_id, block_num)
    }

    const action = message.data.trace.act
    const { from, to, quantity } = action.data

    console.log(
      `Pending transfer [${from} -> ${to} ${quantity}] @ ${printBlock(block_id, block_num)}`
    )
    this.pendingActions.push(message.data.trace.act)
  }

  private commit(blockId: string, blockNum: number) {
    console.log(`Committing all actions up to block ${printBlock(blockId, blockNum)}`)

    if (this.pendingActions.length > 0) {
      // Here, in your production code, action would be saved in a database, as well as error handling
      this.pendingActions.forEach((action) => this.committedActions.push(action))
    }

    console.log(`Bumping last committed block and clearing pending actions`)
    this.pendingActions = []
    this.lastCommittedBlockNum = blockNum

    /**
     * This is one of the most important call of the example. By marking the stream
     * at the right block, upon restart, the stream will automatically starts back
     * at this block ensuring to never miss a single action.
     */
    console.log(`Marking stream up to block ${printBlock(blockId, blockNum)}`)
    this.ensureStream().mark({ atBlockNum: blockNum })

    /**
     * In a real-word production code, you would also need to persist the
     * `this.lastCommittedBlockNum` value to ensure that upon a process
     * restart, you start back from this exact value.
     */

    console.log("")
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
