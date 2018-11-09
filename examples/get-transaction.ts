import { socketFactory, runMain, waitFor } from "./config"
import {
  createEoswsSocket,
  EoswsClient,
  InboundMessageType,
  InboundMessage,
  TransactionData,
  ErrorData
} from "@dfuse/eosws-js"

async function main() {
  const client = new EoswsClient(createEoswsSocket(socketFactory))
  await client.connect()

  const stream = client.getTransaction(
    "d9e98cec9fcb5604da38ca250eb22246520bfeee2c35298032c2fbb825eb406d"
  )

  stream.onMessage((message: InboundMessage<any>) => {
    switch (message.type) {
      case InboundMessageType.TRANSACTION_LIFECYCLE:
        const transactionData = message.data as TransactionData
        console.log(
          `Received transasction lifecycle event for id '${transactionData.lifecycle.id}'`
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

  await waitFor(4000)

  console.log("Unlistening from transaction lifecycle updates...")
  stream.unlisten()
  client.disconnect()
}

runMain(main)
