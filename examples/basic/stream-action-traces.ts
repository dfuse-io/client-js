import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  InboundMessage,
  InboundMessageType,
  waitFor,
  RefreshScheduler,
  createRefreshScheduler,
  ScheduleJob
} from "@dfuse/eosws-js"

class FixedRefreshScheduler implements RefreshScheduler {
  private fixedDelayInMs: number
  private refreshScheduler: RefreshScheduler

  constructor(delayInMs: number) {
    this.fixedDelayInMs = delayInMs
    this.refreshScheduler = createRefreshScheduler()
  }

  public hasScheduledJob(): boolean {
    return this.refreshScheduler.hasScheduledJob()
  }

  public schedule(delayInSeconds: number, job: ScheduleJob): void {
    return this.refreshScheduler.schedule(this.fixedDelayInMs, job)
  }
}

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
    refreshScheduler: new FixedRefreshScheduler(2)
  })

  const stream = await client.streamActionTraces(
    { account: "eosio.token", action_name: "transfer" },
    (message: InboundMessage<any>) => {
      if (message.type === InboundMessageType.ACTION_TRACE) {
        const { from, to, quantity, memo } = message.data.trace.act.data
        console.log(`Transfer [${from} -> ${to}, ${quantity}] (${memo})`)
      }
    }
  )

  await waitFor(5000)
  await stream.unlisten()
}

runMain(main)
