// import { socketFactory, runMain, waitFor } from "./config"
// import { EoswsClient, InboundMessage, createEoswsSocket } from "@dfuse/client"

// async function main() {
//   const onClose = (event: object) => {
//     console.log("Socket was closed", event)
//   }

//   const onError = (event: object) => {
//     console.log("Socket received an error", event)
//   }

//   // When receiving this message, you have been re-connected with the server automatically,
//   // however, we do not (yet) re-register all the streams you had (streams are from calling
//   // main actions on the client like `getActionTraces` or `getTableRows`).
//   //
//   // As such, right now, you are responsible of re-registering the stream yourself. You
//   // should read the https://docs.dfuse.io/#websocket-based-api-never-missing-a-beat section
//   // of the documentation to get a better overview of the concept.
//   //
//   // You can implement the re-connection right here, simply re-connect all your stream handlers
//   // in the callback below, according to the rules specified in the documentation above.
//   const onReconnect = () => {
//     console.log("Socket just reconnected, re-register your streams at the right block...")
//   }

//   const onInvalidMessage = (message: object) => {
//     console.log("Socket received an invalid message", message)
//   }

//   const client = new EoswsClient(
//     createEoswsSocket(socketFactory, {
//       onInvalidMessage,
//       onClose,
//       onError,
//       onReconnect
//     })
//   )

//   await client.connect()

//   console.log("Streaming  ")
//   client
//     .getActionTraces({ account: "eosio.token", action_name: "create" }, { with_progress: 50 })
//     .onMessage((message: InboundMessage<any>) => {
//       console.log(`Received a message of type [${message.type}].`)
//     })

//   // Hopefully you will be able to simulate a disconnection by this happen runs out
//   await waitFor(60000)
// }

// runMain(main)
