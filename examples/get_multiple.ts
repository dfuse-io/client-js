import { socketFactory } from "./config"
import { EOSClient, OutboundMessageType } from "@dfuse/eosws-js"
import { InboundMessageType } from "../src/client"

const client = new EOSClient(socketFactory)

client.connect().then(() => {
  const requestRows = client.getTableRows({ code: "eosio", scope: "eosio", tableName: "global" })

  requestRows!.listen((type: InboundMessageType) => {
    console.log("received message of type: ", type)
  })

  setTimeout(() => {
    console.log("unlistening on table rows................")
    requestRows!.unlisten()
  }, 1000)

  const requestActions = client.getActions({ account: "eosio.token", actionName: "transfer" })

  requestActions!.listen((type: InboundMessageType) => {
    console.log("received message of type: ", type)
  })

  setTimeout(() => {
    console.log("unlistening on actions...............")
    requestActions!.unlisten()
  }, 2000)
})
