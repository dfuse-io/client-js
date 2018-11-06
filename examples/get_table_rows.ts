import { EOSClient } from "../src/client/eos-client"
import { GetTableRowsParams } from "../src/client"

const client = new EOSClient()

client.connect().then(() => {
  const request = client.send<GetTableRowsParams>(
    "get_table_rows",
    {},
    { code: "eosio", scope: "eosio", table_name: "global" }
  )

  request.listen("table_delta", (message) => {
    console.log("message: ", message)
  })

  setTimeout(() => {
    console.log("unlistening................")
    request.unlisten()
  }, 4000)
})
