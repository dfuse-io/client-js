import { socketFactory, runMain, waitFor, DFUSE_REST_URL, DFUSE_API_TOKEN } from "./config"
import {
  EoswsClient,
  InboundMessage,
  InboundMessageType,
  createEoswsSocket,
  ActionTraceData,
  ListeningData,
  ErrorData,
  ApiTokenStorage,
  EoswsConnector
} from "@dfuse/eosws-js"
import fetch from "node-fetch"

interface Transfer {
  from: string
  to: string
  quantity: string
  memo: string
}

async function main() {
  const socket = createEoswsSocket(socketFactory)
  const client = new EoswsClient({ socket, baseUrl: DFUSE_REST_URL!, httpClient: fetch as any })
  const connector = new EoswsConnector({
    client,
    apiKey: DFUSE_API_TOKEN!,
    tokenStorage: new ApiTokenStorage()
  })
  await connector.connect()

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

  await waitFor(5000)
}

runMain(main)
