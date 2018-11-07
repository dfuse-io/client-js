import { EOSClient } from "../src/client/eos-client"
import { socketFactory } from "./config"

const client = new EOSClient(socketFactory)

client.connect().then(() => {
  const request = client.getTableRows({ code: "eosio", scope: "eosio", tableName: "global" })

  request!.listen((type, message) => {
    console.log("message: ", message)
  })

  setTimeout(() => {
    console.log("unlistening................")
    request!.unlisten()
  }, 4000)
})
