import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  InboundMessage,
  InboundMessageType,
  waitFor,
  TransactionLifecycleData
} from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = await client.streamTransaction(
    { id: "d9e98cec9fcb5604da38ca250eb22246520bfeee2c35298032c2fbb825eb406d" },
    (message: InboundMessage) => {
      if (message.type !== InboundMessageType.TRANSACTION_LIFECYCLE) {
        return
      }

      const lifecycle = (message.data as TransactionLifecycleData).lifecycle
      const { creation_irreversible, execution_irreversible, cancelation_irreversible } = lifecycle

      console.log(
        [
          "Received transaction lifecycle",
          `- Receipt: ${JSON.stringify(lifecycle.execution_trace.receipt)}`,
          `- Produced by: ${lifecycle.execution_block_header.producer}`,
          `- Irreversibility: Creation ${creation_irreversible}, Execution ${execution_irreversible}, Cancellation ${cancelation_irreversible}`,
          ""
        ].join("\n")
      )
    }
  )

  await waitFor(5000)
  await stream.unlisten()
}

runMain(main)
