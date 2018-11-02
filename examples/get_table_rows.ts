/* tslint:disable no-console */
import { ws } from "./config"
import { get_table_rows, parse_table_rows } from "@dfuse/eosws-js"

ws.onopen = () => {
  console.log("Subscribing to `get_table_rows` stream")
  ws.send(get_table_rows({ code: "eosio", scope: "eosio", table_name: "global" }))
}

ws.onmessage = (message) => {
  console.log(JSON.parse(message.data.toString()))
  const table = parse_table_rows<any>(message.data)

  if (table) {
    const { owner, producers, last_vote_weight } = table.data.data
    console.log(owner, producers, last_vote_weight)
  }
}
