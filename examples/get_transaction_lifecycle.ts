import { socketFactory } from "./config"
import {
  EoswsClient,
  OutboundMessageType,
  InboundMessageType,
  TransactionLifeCycle,
  InboundMessage
} from "@dfuse/eosws-js"

const client = new EoswsClient(socketFactory)

client.connect().then(() => {
  const request = client.getTransactionLifeCycle(
    "d9e98cec9fcb5604da38ca250eb22246520bfeee2c35298032c2fbb825eb406d"
  )

  request.onMessage(
    (type: InboundMessageType, message: InboundMessage<{ lifecycle: TransactionLifeCycle }>) => {
      console.log("message: ", message.data.lifecycle)
    }
  )

  setTimeout(() => {
    request!.unlisten()
  }, 4000)
})
