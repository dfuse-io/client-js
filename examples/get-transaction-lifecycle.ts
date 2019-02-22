import { socketFactory, runMain, waitFor, DFUSE_URL, DFUSE_API_KEY } from "./config"
import {
  createEoswsSocket,
  EoswsClient,
  InboundMessageType,
  InboundMessage,
  TransactionData,
  ErrorData,
  ListeningData,
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

  const stream = client.getTransactionLifecycle(
    "d9e98cec9fcb5604da38ca250eb22246520bfeee2c35298032c2fbb825eb406d"
  )

  stream.onMessage((message: InboundMessage<any>) => {
    switch (message.type) {
      case InboundMessageType.TRANSACTION_LIFECYCLE:
        const transactionData = message.data as TransactionData
        console.log(
          `Received transaction lifecycle event for id '${transactionData.lifecycle.id}' with:`,
          `\n  * Receipt: `,
          transactionData.lifecycle.execution_trace.receipt,
          `\n  * Number of DB Operations: `,
          transactionData.lifecycle.dbops.length,
          `\n  * Produced by: `,
          transactionData.lifecycle.execution_block_header.producer,
          `\n  * Irreversibility of execution: `,
          transactionData.lifecycle.execution_irreversible
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

  console.log("Unlistening from transaction lifecycle updates...")
  stream.unlisten()
  client.disconnect()
}

runMain(main)
