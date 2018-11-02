/* tslint:disable no-console */
import { socketFactory } from "../config"
import {
  createClient,
  getActionsMessage,
  InboundMessageType,
  InboundMessage
} from "@dfuse/eosws-js"

async function main() {
  const client = createClient(socketFactory)
  await client.connect()

  client.send(getActionsMessage({ account: "eosio.token", actionName: "transfer" }))
  client.onMessage((type: InboundMessageType, message: InboundMessage<any>) => {
    console.log(`Received message ${type}`, JSON.stringify(message))
  })
}

main()
