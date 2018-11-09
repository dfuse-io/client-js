import { socketFactory, runMain, waitFor } from "./config"
import {
  EoswsClient,
  InboundMessage,
  InboundMessageType,
  createEoswsSocket,
  ActionTraceData,
  ErrorData
} from "@dfuse/eosws-js"

interface Transfer {
  from: string
  to: string
  quantity: string
  memo: string
}

async function main() {
  const client = new EoswsClient(createEoswsSocket(socketFactory))
  await client.connect()

  client
    .getActionTraces({ account: "eosio.token", action_name: "transfer" })
    .onMessage((message: InboundMessage<any>) => {
      switch (message.type) {
        case InboundMessageType.ACTION_TRACE:
          const transfer = (message.data as ActionTraceData<Transfer>).trace.act.data
          console.log(
            `Transfer [${transfer.from} -> ${transfer.to}, ${transfer.quantity}] (${transfer.memo})`
          )
          break

        case InboundMessageType.ERROR:
          const error = message.data as ErrorData
          console.log(`Received error: ${error.message} (${error.code})`, error.details)
          break

        default:
          console.log(`Unhandled message of type [${message.type}].`)
      }
    })

  await waitFor(5000)
}

runMain(main)
