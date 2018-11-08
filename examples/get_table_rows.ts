import { EoswsClient } from "../src/client/eosws-client"
import { socketFactory } from "./config"

const client = new EoswsClient(socketFactory)

client.connect().then(() => {
  const request = client.getTableRows({
    json: true,
    code: "eosio",
    scope: "eosio",
    tableName: "global"
  })

  request.onMessage((type, message) => {
    console.log("message: ", message)
  })

  setTimeout(() => {
    console.log("unlistening................")
    request.unlisten()
  }, 4000)
})
