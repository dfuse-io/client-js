import { EOSClient } from "../src/client/eos-client"

const client = new EOSClient()

client.connect().then(() => {
  client.getActions({}, { account: "eosio.token", action_name: "transfer" }).listen((data) => {
    console.log("data:", data)
  })
})
