import { socketFactory, runMain, waitFor } from "./config"
import { EoswsClient, InboundMessage, createEoswsSocket } from "@dfuse/eosws-js"

async function main() {
  const onClose = (event: object) => {
    console.log("Socket was closed", event)
  }

  const onError = (event: object) => {
    console.log("Socket received an error", event)
  }

  const onReconnect = () => {
    console.log("Socket just reconnected, re-register your streams at the right block...")
  }

  const onInvalidMessage = (message: object) => {
    console.log("Socket received an invalid message", message)
  }

  const client = new EoswsClient(
    createEoswsSocket(socketFactory, {
      onInvalidMessage,
      onClose,
      onError,
      onReconnect
    })
  )

  await client.connect()

  console.log("Streaming  ")
  client
    .getActionTraces({ account: "eosio.token", action_name: "create" }, { with_progress: 50 })
    .onMessage((message: InboundMessage<any>) => {
      console.log(`Received a message of type [${message.type}].`)
    })

  // Hopefully you will be able to simulate a disconnection by this happen runs out
  await waitFor(60000)
}

runMain(main)
