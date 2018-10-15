/* tslint:disable no-console */
import { ws } from "./config"
import { get_actions, parse_actions } from ".."

ws.onopen = () => {
  console.log("Subscribing to `get_actions` stream")
  ws.send(get_actions("eosio.token", "transfer", "eosio.token"))
}

ws.onmessage = (message) => {
  console.log(message)
  const actions = parse_actions<any>(message.data)

  if (actions) {
    const { from, to, quantity, memo } = actions.data.trace.act.data
    console.log(from, to, quantity, memo)
  }
}
