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

  const stream = client.getTableRows({ code: "eosio", scope: "eosio", table: "global", json: true })

  stream.onMessage((message: InboundMessage<any>) => {
    switch (message.type) {
      case InboundMessageType.TABLE_DELTA:
        const tableDelta = message.data as TableDeltaData
        console.log(
          `Table eosio/eosio#global delta operation ${tableDelta.dbop.op} at block #${
            tableDelta.block_num
          }`
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

  console.log("Unlistening from table updates...")
  stream.unlisten()
  client.disconnect()
}

runMain(main)
