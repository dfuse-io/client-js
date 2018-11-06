import { EOSClient } from "../src/client/eos-client"

const client = new EOSClient()

client.connect().then(() => {
  const requestRows = client.getTableRows(
    {},
    { code: "eosio", scope: "eosio", table_name: "global" }
  )

  requestRows.listen((message) => {
    console.log("received message of type: ", message.type)
  })

  setTimeout(() => {
    console.log("unlistening on table rows................")
    requestRows.unlisten()
  }, 1000)

  const requestActions = client.getActions({}, { account: "eosio.token", action_name: "transfer" })

  requestActions.listen((message) => {
    console.log("received message of type: ", message.type)
  })

  setTimeout(() => {
    console.log("unlistening on actions...............")
    requestActions.unlisten()
  }, 2000)
})
