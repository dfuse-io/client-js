import { socketFactory, runMain, waitFor, forever } from "./config"
import {
  createEoswsSocket,
  EoswsClient,
  InboundMessageType,
  InboundMessage,
  TableDeltaData,
  ErrorData
} from "@dfuse/eosws-js"

let lastSeenMessageAt = new Date()

async function main() {
  const onClose = (event: CloseEvent) => {
    console.log(`The socket has terminated with code ${event.code} (${lastMessageDeltaWithNow()}).`)
    markSeenMessage()
  }

  const onError = (event: Event) => {
    console.log(
      `An error occurred at the socket level wit reason ${event} (${lastMessageDeltaWithNow()}).`
    )
    markSeenMessage()
  }

  const onReconnect = () => {
    console.log(
      `The socket has reconnected succesfully to the remote endpoint (${lastMessageDeltaWithNow()}).`
    )
    markSeenMessage()
  }

  const onInvalidMessage = (payload: any) => {
    console.log(
      `Received an unknown message from the remote endpoint, is the library up-to-date (${lastMessageDeltaWithNow()})?`,
      JSON.stringify(payload)
    )
    markSeenMessage()
  }

  const client = new EoswsClient(
    createEoswsSocket(socketFactory, {
      onClose,
      onError,
      onReconnect,
      onInvalidMessage
    })
  )

  await client.connect()

  const stream = client.getTableRows({
    code: "betdiceadmin",
    scope: "betdiceadmin",
    table: "player"
  })

  stream.onMessage((message: InboundMessage<any>) => {
    console.log(`Received a message of type ${message.type} (${lastMessageDeltaWithNow()}).`)
    markSeenMessage()
  })

  await forever()
}

function markSeenMessage() {
  lastSeenMessageAt = new Date()
}

function lastMessageDeltaWithNow() {
  const differenceInMs = new Date().getTime() - lastSeenMessageAt.getTime()

  return `+${differenceInMs}ms`
}

runMain(main)
