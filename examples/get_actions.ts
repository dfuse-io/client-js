import { socketFactory } from "./config"
import { EOSClient, InboundMessage, InboundMessageType, ActionTrace } from "@dfuse/eosws-js"

const client = new EOSClient(socketFactory)

interface Transfer {
  from: string
  to: string
  quantity: string
  memo: string
}

client.connect().then(() => {
  client
    .getActions({ account: "eosio.token", actionName: "transfer" })!
    .listen((type: string, rawMessage) => {
      if (type === InboundMessageType.ACTION_TRACE) {
        const message = rawMessage as InboundMessage<ActionTrace<Transfer>>
        const transfer = message.data.trace.act.data

        console.log(
          `Received transfer from ${transfer.from} to ${transfer.to} of amount ${
            transfer.quantity
          } (${transfer.memo})`
        )
      }
    })
})
