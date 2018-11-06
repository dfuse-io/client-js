import { EOSClient } from "../src/client/eos-client"

const client = new EOSClient()

client.connect().then(() => {
  const request = client.send(
    "get_table_rows",
    {},
    { code: "eosio", scope: "eosio", table_name: "global" }
  )

  request.listen("table_delta", (data) => {
    console.log("data: ", data)
  })

  setTimeout(() => {
    console.log("unlistening................")
    client.unlisten(request.reqId)
  }, 4000)
})
