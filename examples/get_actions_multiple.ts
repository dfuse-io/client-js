/* tslint:disable no-console */
import { ws } from "./config"
import { get_actions, parse_actions, generateReqId } from ".."

interface Transfer {
  from: string
  to: string
  quantity: string
  memo: string
}

interface Issue {
  to: string
  quantity: string
  memo: string
  issuer: string
}

const transfer_req_id = generateReqId()
const issue_req_id = generateReqId()

ws.onopen = () => {
  console.log("Subscribing to `get_actions` stream (multiple ones)")
  ws.send(
    get_actions({ account: "eosio.token", action_name: "transfer" }, { req_id: transfer_req_id })
  )
  ws.send(get_actions({ account: "eosio.token", action_name: "issue" }, { req_id: issue_req_id }))
}

ws.onmessage = (message) => {
  console.log(JSON.parse(message.data.toString()))
  const transfer_actions = parse_actions<Transfer>(message.data, transfer_req_id)
  const issue_actions = parse_actions<Issue>(message.data, transfer_req_id)

  if (transfer_actions) {
    const { from, to, quantity, memo } = transfer_actions.data.trace.act.data
    console.log(from, to, quantity, memo)
  }

  if (issue_actions) {
    const { to, quantity, memo, issuer } = issue_actions.data.trace.act.data
    console.log(to, quantity, memo, issuer)
  }
}
