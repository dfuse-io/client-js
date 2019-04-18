import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  waitFor,
  Stream,
  DfuseClient,
  dynamicMessageDispatcher,
  TableDeltaInboundMessage,
  TableSnapshotInboundMessage
} from "@dfuse/client"

/**
 * In this example, we will showcase how to navigate micro-forks
 * by correclty processing the new/undo/redo steps ensuring to have
 * up-to-date data against the current longuest active chain on
 * the network.
 *
 * Micro-forks can happen when multitudes of scenarios and need
 * to be handled correctly to ensure up-to-date information is
 * available.
 *
 * To know more about micro-forks, check out
 * https://www.eoscanada.com/en/microforks-everything-you-need-to-know-about-microforks-on-an-eos-blockchain
 * for global base knowledge about them.
 *
 * The dfuse Stream API is able to send you undo/redo steps when
 * some blocks are not part of the longuest chain anymore (`undo`) or
 * in the opposite, re-become part of the longuest chain (`redo`).
 *
 * In the examples, we keep a list of the 5 last updates to the
 * `eosio/global/eosio` table. Upon `new` step, the update is pushed
 * on the stack (last item being popped first if stack at max capacity
 * of 5 elements). On an `undo` step, we pop the top element from the
 * top of the stack. On a `redo` step, we push it back on top applying
 * the same rule as with a `new` step.
 *
 * @see https://docs.dfuse.io/#websocket-based-api-navigating-forks
 * @see https://www.eoscanada.com/en/microforks-everything-you-need-to-know-about-microforks-on-an-eos-blockchain
 */
async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const engine = new Engine(client)
  await engine.start()

  await waitFor(50000)
  await engine.stop()
}

// Only the actual fields we need, the full row is bigger than that
type EosioGlobalRow = {
  total_ram_stake: number
  total_unpaid_blocks: number
}

class Engine {
  private client: DfuseClient
  private stream?: Stream

  private updates: EosioGlobalRow[] = []

  constructor(client: DfuseClient) {
    this.client = client
  }

  public async start() {
    console.log("Engine starting")
    this.stream = await this.client.streamTableRows(
      {
        code: "eosio",
        table: "global",
        scope: "eosio"
      },
      dynamicMessageDispatcher({
        listening: this.onListening,
        table_delta: this.onTableDelta,
        table_snapshot: this.onTableSnapshot,
        progress: this.onProgress
      }),
      {
        listen: true,
        fetch: true,
        // We use progress to display current state of table at regular interval
        with_progress: 50
      }
    )
  }

  private onListening = () => {
    console.log("Stream is now listening for action(s)")
  }

  private onProgress = () => {
    printUpdates(this.updates)
  }

  private onTableSnapshot = (message: TableSnapshotInboundMessage<EosioGlobalRow>) => {
    console.log("Initializing first update to initial state of table")

    // We expect a single row to exist on this table
    this.updates = [message.data.rows[0].json!]

    printUpdates(this.updates, "")
  }

  private onTableDelta = (message: TableDeltaInboundMessage<EosioGlobalRow>) => {
    switch (message.data.step) {
      case "new":
        this.pushUpdate(message.data.dbop.new!.json!)
        break

      case "undo":
        console.log("Ohhhh dealing with undo...")
        this.popUpdate()
        break

      case "redo":
        console.log("Ohhhh dealing with redo...")
        this.pushUpdate(message.data.dbop.new!.json!)
        break
    }
  }

  public async stop() {
    await this.ensureStream().close()

    console.log("Current last 5 updates")
    printUpdates(this.updates)
  }

  private popUpdate() {
    if (this.updates.length >= 1) {
      this.updates = [...this.updates.slice(0, 4)]
    }
  }

  private pushUpdate(update: EosioGlobalRow) {
    if (this.updates.length >= 5) {
      this.updates = [...this.updates.slice(1), update]
    } else {
      this.updates = [...this.updates, update]
    }
  }

  private ensureStream(): Stream {
    if (this.stream) {
      return this.stream
    }

    throw new Error("Stream should be set at this runtime execution point")
  }
}

function printUpdates(updates: EosioGlobalRow[], header?: string) {
  if (header !== "") {
    console.log("5 last updates (or less)")
  }

  if (!updates || updates.length <= 0) {
    console.log("Nothing yet...")
    return
  }

  updates.forEach((update) => console.log(`- ${printDelta(update)}`))
  console.log()
}

function printDelta(row: EosioGlobalRow): string {
  return `${row.total_ram_stake} / ${row.total_unpaid_blocks}`
}

runMain(main)
