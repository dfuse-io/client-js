import { socketFactory } from "./config"
import { EoswsClient, OutboundMessageType, InboundMessageType } from "@dfuse/eosws-js"

const client = new EoswsClient(socketFactory)

client.connect().then(() => {
  const requestRows = client.getTableRows({
    json: true,
    code: "eosio",
    scope: "eosio",
    tableName: "global"
  })

  requestRows.onMessage((type: InboundMessageType) => {
    console.log("received message of type: ", type)
  })

  setTimeout(() => {
    console.log("unlistening on table rows................")
    requestRows!.unlisten()
  }, 1000)

  const requestActions = client.getActionTraces({ account: "eosio.token", actionName: "transfer" })

  requestActions.onMessage((type: InboundMessageType) => {
    console.log("received message of type: ", type)
  })

  setTimeout(() => {
    console.log("unlistening on actions...............")
    requestActions.unlisten()
  }, 2000)
})
