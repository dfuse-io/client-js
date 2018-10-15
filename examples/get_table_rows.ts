/* tslint:disable no-console */
import { ws } from "./config"
import { get_table_rows, parse_table_rows } from ".."

ws.onopen = () => {
  console.log("Subscribing to `get_table_rows` stream")
  ws.send(get_table_rows("eosio", "eosio", "voters"))
}

ws.onmessage = (message) => {
  const table = parse_table_rows<any>(message.data)

  if (table) {
    const { owner, producers, last_vote_weight } = table.data.row
    console.log(owner, producers, last_vote_weight)
  }
}
