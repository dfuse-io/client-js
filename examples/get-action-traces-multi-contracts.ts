import { socketFactory, runMain, waitFor } from "./config"
import {
  EoswsClient,
  InboundMessage,
  InboundMessageType,
  createEoswsSocket,
  ActionTraceData,
  ErrorData
} from "@dfuse/eosws-js"

const CONTRACTS = [
  "nebulasystem",
  "nebulaccount",
  "nebulatokenn",
  "nebulacoinnn",
  "nebulatalked",
  "nebulaskills",
  "nebulajobbbb",
  "nebulaoracle",
  "nebulawhitel"
]

const onMessage = (message: InboundMessage<any>) => {
  switch (message.type) {
    case InboundMessageType.ACTION_TRACE:
      const action = (message.data as ActionTraceData<any>).trace.act
      console.log(`Action received for account ${action.account}.`)
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

  console.log("Listening for messages for 60 seconds.")
  await waitFor(60000)
}

runMain(main)
