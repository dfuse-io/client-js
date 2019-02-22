import * as path from "path"
import WebSocketClient from "ws"
import dotenv from "dotenv"
import { ApiTokenInfo } from "@dfuse/eosws-js"

dotenv.config({ path: path.join(__dirname, "..", ".env") })

export let DFUSE_WS_URL = process.env.DFUSE_WS_URL
export let DFUSE_REST_URL = process.env.DFUSE_REST_URL

export const DFUSE_API_TOKEN = process.env.DFUSE_API_TOKEN

if (!DFUSE_WS_URL) {
  DFUSE_WS_URL = "mainnet.eos.dfuse.io"
}

if (!DFUSE_REST_URL) {
  DFUSE_REST_URL = "https://mainnet.eos.dfuse.io"
}
if (!DFUSE_API_TOKEN) {
  throw new Error("missing DFUSE_API_TOKEN in your environment variables")
}

const origin = "https://github.com/dfuse-io/eosws-js"
export const socketFactory = async (tokenInfo: ApiTokenInfo): Promise<WebSocket> => {
  return (new WebSocketClient(`wss://${DFUSE_WS_URL}/v1/stream?token=${tokenInfo.token}`, {
    origin
  }) as any) as WebSocket
}

export function waitFor(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function runMain(runner: () => Promise<void>) {
  runner()
    .then(() => {
      console.log("Example completed.")
      process.exit(0)
    })
    .catch((error) => {
      console.log("An untrapped error occurred.", error)
      process.exit(1)
    })
}
