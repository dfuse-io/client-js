/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  waitFor,
  Stream,
  DfuseClient,
  dynamicMessageDispatcher,
  TableDeltaInboundMessage,
  TableSnapshotInboundMessage,
} from "@dfuse/client"

/**
 * In this example, we will showcase how to navigate microforks
 * by correclty processing the new/undo/redo steps, ensuring that you have
 * up-to-date data against the current longest active chain on
 * the network.
 *
 * Microforks can happen in many different scenarios and need
 * to be handled correctly to ensure up-to-date information is
 * available.
 *
 * To learn more about microforks, check out
 * https://www.eoscanada.com/en/microforks-everything-you-need-to-know-about-microforks-on-an-eos-blockchain
 * for global base knowledge about them.
 *
 * The dfuse Stream API is able to send you undo/redo steps when
 * some blocks are not part of the longest chain anymore (`undo`) or
 * in the opposite, become part of the longust chain again (`redo`).
 *
 * In this example, we keep a list of the 5 last updates to the
 * `eosio/global/eosio` table. Upon each `new` step, the update is pushed
 * on the stack (last item being popped first if the stack is at max capacity
 * of 5 elements). On an `undo` step, we pop the top element from the
 * top of the stack. On a `redo` step, we push it back the top applying
 * the same rule as with a `new` step.
 *
 * @see https://docs.dfuse.io/#websocket-based-api-navigating-forks
 */
async function main(): Promise<void> {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
  })

  const engine = new Engine(client)
  await engine.start()

  await waitFor(50000)
  await engine.stop()

  client.release()
}

// Only retrieve the actual fields we need, the full row is bigger than that
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

  public async start(): Promise<void> {
    console.log("Engine starting")
    this.stream = await this.client.streamTableRows(
      {
        code: "eosio",
        table: "global",
        scope: "eosio",
      },
      dynamicMessageDispatcher({
        listening: this.onListening,
        table_delta: this.onTableDelta,
        table_snapshot: this.onTableSnapshot,
        progress: this.onProgress,
      }),
      {
        listen: true,
        fetch: true,
        // We use progress to display the current state of the table at a regular interval
        with_progress: 50,
      }
    )
  }

  private onListening = (): void => {
    console.log("Stream is now listening for action(s)")
  }

  private onProgress = (): void => {
    printUpdates(this.updates)
  }

  private onTableSnapshot = (message: TableSnapshotInboundMessage<EosioGlobalRow>): void => {
    console.log("Initializing first update to initial state of table")

    // We expect a single row to exist on this table
    this.updates = [message.data.rows[0].json!]

    printUpdates(this.updates, "")
  }

  private onTableDelta = (message: TableDeltaInboundMessage<EosioGlobalRow>): void => {
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

  public async stop(): Promise<void> {
    await this.ensureStream().close()

    console.log("Current last 5 updates")
    printUpdates(this.updates)
  }

  private popUpdate(): void {
    if (this.updates.length >= 1) {
      this.updates = [...this.updates.slice(0, 4)]
    }
  }

  private pushUpdate(update: EosioGlobalRow): void {
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

function printUpdates(updates: EosioGlobalRow[], header?: string): void {
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
