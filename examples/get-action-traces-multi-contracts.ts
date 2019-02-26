import { socketFactory, runMain, waitFor, DFUSE_URL, DFUSE_API_KEY } from "./config"
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

const CONTRACTS = ["eosmechanics", "eosknightsio", "eosiotokener"]

const onMessage = (message: InboundMessage<any>) => {
  switch (message.type) {
    case InboundMessageType.LISTENING:
      const listeningMessage = message as InboundMessage<ListeningData>
      console.log(
        `Received Listening message event (reqID: ${listeningMessage.req_id}, next_block: ${
          listeningMessage.data.next_block
        })`
      )
      break

    case InboundMessageType.ACTION_TRACE:
      const action = (message.data as ActionTraceData<any>).trace.act
      console.log(`Action "${action.name}" received for account "${action.account}".`)
      break

    case InboundMessageType.ERROR:
      const error = message.data as ErrorData
      console.log(`Received error: ${error.message} (${error.code})`, error.details)
      break

    default:
      console.log(`Unhandled message of type [${message.type}].`)
  }
}

async function main() {
  const client = new EoswsClient({
    socket: createEoswsSocket(socketFactory),
    baseUrl: `https://${DFUSE_URL!}`,
    httpClient: fetch as any
  })
  const connector = new EoswsConnector({ client, apiKey: DFUSE_API_KEY! })
  await connector.connect()

  client.getActionTraces({ accounts: CONTRACTS.join("|") }).onMessage(onMessage)

  console.log("Listening for messages for 20 seconds.")
  await waitFor(20000)
}

runMain(main)
