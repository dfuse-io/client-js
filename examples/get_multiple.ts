import { EOSClient } from "../src/client/eos-client"

const client = new EOSClient()

client.connect().then(() => {
  const requestRows = client.getTableRows(
    {},
    { code: "eosio", scope: "eosio", table_name: "global" }
  )

  requestRows.listen((data) => {
    console.log("received data of type: ", data.type)
  })

  setTimeout(() => {
    console.log("unlistening on table rows................")
    client.unlisten(requestRows.reqId)
  }, 1000)

  const requestActions = client.getActions({}, { account: "eosio.token", action_name: "transfer" })

  requestActions.listen((data) => {
    console.log("received data of type: ", data.type)
  })

  setTimeout(() => {
    console.log("unlistening on actions...............")
    client.unlisten(requestActions.reqId)
  }, 2000)
})
