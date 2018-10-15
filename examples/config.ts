import * as path from "path"
import WebSocket from "ws"
import dotenv from "dotenv"

dotenv.config({ path: path.join(__dirname, "..", ".env") })

export let EOSWS_ENDPOINT = process.env.EOSWS_ENDPOINT
export const EOSWS_API_KEY = process.env.EOSWS_API_KEY

if (!EOSWS_ENDPOINT) {
  EOSWS_ENDPOINT = "mainnet.eos.dfuse.io"
}

if (!EOSWS_API_KEY) {
  throw new Error("missing EOSWS_API_KEY in your environment variables")
}

const origin = "https://github.com/dfuse-io/eosws-js"
export const ws = new WebSocket(`wss://${EOSWS_ENDPOINT}/v1/stream?token=${EOSWS_API_KEY}`, {
  origin
})
