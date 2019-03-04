import { socketFactory, runMain, waitFor } from "./config"
import {
  createEoswsSocket,
  EoswsClient,
  InboundMessageType,
  InboundMessage,
  TableDeltaData,
  ErrorData
} from "@dfuse/eosws-js"

async function main() {
  const client = new EoswsClient(createEoswsSocket(socketFactory))
  await client.connect()

  const stream = client.getTableRows(
    { code: "eosio.token", scope: "eosio.token", table: "accounts" },
    { listen: false, fetch: true }
  )

  stream.onMessage((message: InboundMessage<any>) => {
    switch (message.type) {
      case InboundMessageType.ERROR:
        const error = message.data as ErrorData
        console.log(`Received error: ${error.message} (${error.code})`, error.details)
        break

      case InboundMessageType.TABLE_SNAPSHOT:
        console.log("Received table snapshot.")
        console.log(JSON.stringify(message))

        console.log("Disconnecting from endpoint...")
        stream.unlisten()
        client.disconnect()
        break

      default:
        console.log(`Unhandled message of type [${message.type}].`)
    }
  })

  // Wait a bit for stuff to happen
  await waitFor(2500)
}

runMain(main)
