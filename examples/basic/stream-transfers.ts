import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  InboundMessage,
  InboundMessageType,
  waitFor,
  dynamicMessageDispatcher,
  ActionTraceInboundMessage
} from "@dfuse/client"
import { ActionTraceData } from "../../src/types/action-trace"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = await client.streamActionTraces(
    { accounts: "eosio.token", action_names: "transfer" },
    dynamicMessageDispatcher({
      action_trace: (message: ActionTraceInboundMessage) => {
        const { from, to, quantity, memo } = (message.data as ActionTraceData<any>).trace.act.data
        console.log(`Transfer [${from} -> ${to}, ${quantity}] (${memo})`)
      }
    })
  )

  await waitFor(5000)
  await stream.close()
}

runMain(main)
