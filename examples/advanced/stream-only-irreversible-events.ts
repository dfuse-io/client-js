// import { socketFactory, runMain, waitFor } from "./config"
// import {
//   EoswsClient,
//   InboundMessage,
//   InboundMessageType,
//   createEoswsSocket,
//   ActionTraceData,
//   ErrorData,
//   TransactionData
// } from "@dfuse/client"

// const CONTRACTS = ["eosmechanics", "eosknightsio", "eosiotokener"]

// const client = new EoswsClient(createEoswsSocket(socketFactory))

// let actionStream: any
// let transactionStream: any
// let terminate = false
// let transactionListening = false

// const onMessage = (message: InboundMessage<any>) => {
//   switch (message.type) {
//     case InboundMessageType.ERROR:
//       const error = message.data as ErrorData
//       console.log(`Received error: ${error.message} (${error.code})`, error.details)
//       break

//     case InboundMessageType.ACTION_TRACE:
//       onActionMessage(message)
//       break

//     case InboundMessageType.TRANSACTION_LIFECYCLE:
//       onTransactionMessage(message)
//       break
//   }
// }

// const onActionMessage = (message: InboundMessage<any>) => {
//   const data = message.data as ActionTraceData<any>
//   const action = data.trace.act

//   if (!transactionListening) {
//     transactionListening = true

//     console.log(`Action "${action.name}" received for account "${action.account}".`)
//     console.log(`About to listening for transaction "${data.trx_id}" to become irreversible`)

//     actionStream.unlisten()

//     transactionStream = client.getTransactionLifecycle(data.trx_id, { req_id: "transaction" })
//     transactionStream.onMessage(onMessage)
//   }
// }

// const onTransactionMessage = (message: InboundMessage<any>) => {
//   const data = message.data as TransactionData
//   const lifecycle = data.lifecycle

//   if (lifecycle.execution_irreversible === true && terminate !== true) {
//     console.log("Transaction passed irreveribility.")
//     terminate = true
//     transactionStream.unlisten()
//   } else {
//     console.log("Transaction progressing through irreveribility ...")
//   }
// }

// async function main() {
//   await client.connect()

//   actionStream = client.getActionTraces({
//     accounts: CONTRACTS.join("|"),
//     action_names: "transfer|issue"
//   })

//   console.log("Waiting for filtered action to appear...")
//   actionStream.onMessage(onMessage)

//   while (!terminate) {
//     await waitFor(2500)
//   }
// }

// runMain(main)
