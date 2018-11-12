import { socketFactory, runMain, waitFor } from "./config"
import {
  EoswsClient,
  InboundMessage,
  InboundMessageType,
  createEoswsSocket,
  ActionTraceData,
  ListeningData,
  ErrorData
} from "@dfuse/eosws-js"

const CONTRACTS = ["eosmechanics", "eosknightsio", "eosiotokener"]

const onMessage = (message: InboundMessage<any>) => {
  switch (message.type) {
    case InboundMessageType.ACTION_TRACE:
      const action = (message.data as ActionTraceData<any>).trace.act
      console.log(`Action "${action.name}" received for account "${action.account}".`)
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
}

async function main() {
  const client = new EoswsClient(createEoswsSocket(socketFactory))
  await client.connect()

  for (const account of CONTRACTS) {
    client.getActionTraces({ account }).onMessage(onMessage)
  }

  console.log("Listening for messages for 20 seconds.")
  await waitFor(20000)
}

runMain(main)
