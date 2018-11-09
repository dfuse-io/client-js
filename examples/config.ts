import * as path from "path"
import IsomorphicWebSocket from "isomorphic-ws"
import dotenv from "dotenv"

dotenv.config({ path: path.join(__dirname, "..", ".env") })

export let DFUSE_IO_ENDPOINT = process.env.DFUSE_IO_ENDPOINT
export const DFUSE_IO_API_KEY = process.env.DFUSE_IO_API_KEY

if (!DFUSE_IO_ENDPOINT) {
  DFUSE_IO_ENDPOINT = "mainnet.eos.dfuse.io"
}

if (!DFUSE_IO_API_KEY) {
  throw new Error("missing DFUSE_IO_API_KEY in your environment variables")
}

const origin = "https://github.com/dfuse-io/eosws-js"
export const socketFactory = (): WebSocket => {
  return (new IsomorphicWebSocket(
    `wss://${DFUSE_IO_ENDPOINT}/v1/stream?token=${DFUSE_IO_API_KEY}`,
    {
      origin
    }
  ) as any) as WebSocket
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
