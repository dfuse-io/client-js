import { socketFactory, runMain, waitFor, DFUSE_REST_URL, DFUSE_API_TOKEN } from "./config"
import {
  createEoswsSocket,
  EoswsClient,
  InboundMessageType,
  InboundMessage,
  TableDeltaData,
  ListeningData,
  ErrorData,
  ApiTokenStorage,
  EoswsConnector
} from "@dfuse/eosws-js"
import fetch from "node-fetch"

async function main() {
  const socket = createEoswsSocket(socketFactory)
  const client = new EoswsClient({ socket, baseUrl: DFUSE_REST_URL!, httpClient: fetch as any })
  const connector = new EoswsConnector({
    client,
    apiKey: DFUSE_API_TOKEN!,
    tokenStorage: new ApiTokenStorage()
  })
  await connector.connect()

  const stream = client.getTableRows({ code: "eosio", scope: "eosio", table: "global", json: true })

  stream.onMessage((message: InboundMessage<any>) => {
    switch (message.type) {
      case InboundMessageType.TABLE_DELTA:
        const tableDelta = message.data as TableDeltaData
        console.log(
          `Table eosio/eosio#global delta operation ${tableDelta.dbop.op} at block #${
            tableDelta.block_num
          } step: ${tableDelta.step}`
        )
        break

      case InboundMessageType.LISTENING:
        const listeningResp = message as InboundMessage<ListeningData>
        console.log(
          `Received Listening message event, reqID: ${listeningResp.req_id}, next_block: ${
            listeningResp.data.next_block
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
