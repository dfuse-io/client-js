/* tslint:disable no-console */
import { ws } from "./config"
import { get_actions, parse_actions } from ".."

ws.onopen = () => {
  console.log("Subscribing to `get_actions` stream")
  ws.send(get_actions({ account: "eosio.token", action_name: "transfer" }))
}

ws.onmessage = (message) => {
  console.log(message)
  const actions = parse_actions<any>(message.data)

  if (actions) {
    const { from, to, quantity, memo } = actions.data.trace.act.data
    console.log(from, to, quantity, memo)
  }
}
