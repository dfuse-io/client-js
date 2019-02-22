import { socketFactory, runMain, waitFor, DFUSE_URL, DFUSE_API_KEY } from "./config"
import {
  createEoswsSocket,
  EoswsClient,
  InboundMessageType,
  InboundMessage,
  TableDeltaData,
  ErrorData,
  ApiTokenStorage,
  EoswsConnector
} from "@dfuse/eosws-js"
import fetch from "node-fetch"

async function main() {
  const client = new EoswsClient({
    socket: createEoswsSocket(socketFactory),
    baseUrl: `https://${DFUSE_URL!}`,
    httpClient: fetch as any
  })
  const connector = new EoswsConnector({ client, apiKey: DFUSE_API_KEY! })
  await connector.connect()

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
