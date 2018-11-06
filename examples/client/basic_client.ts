/* tslint:disable no-console */
import { socketFactory } from "../config"
import {
  createClient,
  getActionsMessage,
  InboundMessageType,
  InboundMessage,
  ActionTrace
} from "@dfuse/eosws-js"

interface Transfer {
  from: string
  to: string
  quantity: string
  memo: string
}

async function main() {
  const client = createClient(socketFactory)
  await client.connect((type: InboundMessageType, rawMessage: InboundMessage<any>) => {
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

  try {
    await client.send(getActionsMessage({ account: "eosio.token", actionName: "transfer" }))
  } catch (error) {
    console.log("Unable to send", error)
  }
}

main()
