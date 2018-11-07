import { socketFactory } from "./config"
import { EoswsClient, InboundMessage, InboundMessageType, ActionTrace } from "@dfuse/eosws-js"

const client = new EoswsClient(socketFactory)

interface Transfer {
  from: string
  to: string
  quantity: string
  memo: string
}

client.connect().then(() => {
  client
    .getActionTraces({ account: "eosio.token", actionName: "transfer" })!
    .listen((type: InboundMessageType, message: InboundMessage<ActionTrace<Transfer>>) => {
      if (type === InboundMessageType.ACTION_TRACE) {
        const transfer = message.data.trace.act.data

        console.log(
          `Received transfer from ${transfer.from} to ${transfer.to} of amount ${
            transfer.quantity
          } (${transfer.memo})`
        )
      }
    })
})
