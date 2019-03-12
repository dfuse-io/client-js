import { socketFactory, runMain, waitFor } from "./config"
import {
  EoswsClient,
  InboundMessage,
  InboundMessageType,
  createEoswsSocket,
  ActionTraceData,
  ListeningData,
  ProgressData,
  ErrorData
} from "@dfuse/eosws-js"

interface Transfer {
  from: string
  to: string
  quantity: string
  memo: string
}

async function main() {
  // We keep the same request id, so on re-connect, the listener can be wired back to our initial handler
  const listenRequestId = "token-transfer-" + Math.random() * 12345

  let startBlock = 0
  const messageHandler = (message: InboundMessage<any>) => {
    switch (message.type) {
      case InboundMessageType.LISTENING:
        const listeningResp = message as InboundMessage<ListeningData>
        console.log(
          `Received Listening message event, reqID: ${listeningResp.req_id}, next_block: ${
            listeningResp.data.next_block
          }`
        )
        break

      case InboundMessageType.PROGRESS:
        const progressMsg = message as InboundMessage<ProgressData>
        const progressData = progressMsg.data

        startBlock = progressData.block_num
        console.log(
          `Progress received now at block [${progressData.block_id} (#${progressData.block_num})]`
        )

        break

      // case InboundMessageType.ACTION_TRACE:
      //   const transfer = (message.data as ActionTraceData<Transfer>).trace.act.data
      //   console.log(
      //     `Transfer [${transfer.from} -> ${transfer.to}, ${transfer.quantity}] (${transfer.memo})`
      //   )
      //   break

      case InboundMessageType.ERROR:
        const error = message.data as ErrorData
        console.log(`Received error: ${error.message} (${error.code})`, error.details)
        break

      // default:
      //   console.log(`Unhandled message of type [${message.type}].`)
    }
  }

  const listenData = { account: "eosio.token", action_name: "transfer" }
  const commonListenOptions = { req_id: listenRequestId, with_progress: 1 }

  const client = new EoswsClient(
    createEoswsSocket(socketFactory, {
      autoReconnect: true,
      onClose: () => {
        console.log("Socket connection is now closed.")
      },

      onReconnect: () => {
        console.log(`Reconnected to socket, starting back at block #${startBlock}.`)
        client.getActionTraces(listenData, { ...commonListenOptions, start_block: startBlock })
      }
    })
  )

  await client.connect()
  client.getActionTraces(listenData, { ...commonListenOptions }).onMessage(messageHandler)

  // Kill your connection in-between to see the re-connection happen
  await waitFor(45000)
}

runMain(main)
