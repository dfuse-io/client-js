import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK, prettifyJson } from "../config"
import { createDfuseClient, InboundMessage, InboundMessageType, waitFor } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = await client.streamActionTraces(
    {
      accounts: "eosio.token|thekarmadapp|trustdicewin",
      with_inline_traces: true,
      with_dbops: true,
      with_dtrxops: true,
      with_ramops: true
    },
    (message: InboundMessage<any>) => {
      if (message.type !== InboundMessageType.ACTION_TRACE) {
        return
      }

      /**
       * JSON examples of various fields possibilities (since they might
       * not always appear in the streaming time frame):
       *
       * ```
       * {
       *  dbops: [
       *    // An `ActionTraceDbOp` row update operation
       *    {
       *      "op": "UPD",
       *      "action_idx": 8,
       *      "opayer": "eosbetbank11",
       *      "npayer": "eosbetbank11",
       *      "path": "eosio.token/eosbetbank11/accounts/........ehbo5",
       *      "old": "d11a231c0000000004454f5300000000",
       *      "new": "cd1a231c0000000004454f5300000000"
       *    },
       *
       *    // An `ActionTraceDbOp` row insertion operation
       *    {
       *      "op": "INS",
       *      "action_idx": 0,
       *      "npayer": "hj1111111534",
       *      "path": "eosio.token/hj1111111125/accounts/........ehbo5",
       *      "new": "c02709000000000004454f5300000000"
       *    }
       *
       *    // An `ActionTraceDbOp` row removal operation
       *    {
       *      "op": "REM",
       *      "action_idx": 2,
       *      "opayer": "trustdicewin",
       *      "path": "trustdicewin/trustdicewin/hash/......1iwm13h",
       *      "old": "90bd994111e45fc947f7f7d4823081cdf13d05c12f31bf2049aec55e170aa0bcbf66c85c00000000"
       *    },
       *  ]
       * }
       * ```
       */

      console.log(prettifyJson(message.data))
    }
  )

  await waitFor(15000)
  await stream.close()
}

runMain(main)
