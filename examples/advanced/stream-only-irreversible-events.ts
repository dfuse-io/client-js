import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, InboundMessage, InboundMessageType, waitFor } from "@dfuse/client"
import { ActionTraceData } from "../../src/types/action-trace"

/**
 * In this example, you will use the `irreversible_only` option on some
 * stream to receives only a notification when data is now deemed
 * irreversible by the chain.
 *
 * **Note** Only `streamActionTraces` will correctly support the common
 * `irreversible_only` flag for now. If you try on anything else, you
 * will still receives reversible notifications, be aware!
 */
async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = await client.streamActionTraces(
    { accounts: "eosio.token", action_names: "transfer" },
    (message: InboundMessage) => {
      if (message.type !== InboundMessageType.ACTION_TRACE) {
        return
      }

      const { from, to, quantity, memo } = (message.data as ActionTraceData<any>).trace.act.data
      console.log(`Irreversible transfer [${from} -> ${to}, ${quantity}] (${memo})`)
    },
    {
      /**
       * We request to only obtain irreversible notifications by specifying this
       * common flag and setting to true.
       */
      irreversible_only: true
    }
  )

  await waitFor(5000)
  await stream.close()
}

runMain(main)
