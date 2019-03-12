import * as path from "path"
import WebSocketClient from "ws"
import dotenv from "dotenv"

// This is imported to modify the global scope adding to it the `fetch` method
// so that examples works out of the box.
//
// If you project is a web application or react native mobile application,
// this import is not required (as `fetch` is already available there in the
// global scope).
//
// If your project is a server application with Node.js, you have two options.
// You add this import to your own project in the main source file before
// instantiating a `DfuseClient`.
//
// Second option, when creating the `DfuseClient` via the factory method,
// simply specify the `fetch` option and provide the implementation without
// affecting the global scope (`node-fetch` package can be used for that).
import "isomorphic-fetch"

// @ts-ignore FIXME Explains why it's like that and how to override without
//                  a global scope change.
global.WebSocket = WebSocketClient

// You don't require to have this configuration and the associated import
// in your own project (of course, feel free to copy it if you think it helps).
//
// Simply provide the various options of the example(s) hard-coded in your
// code and pull from other configuration storage instances.
dotenv.config({ path: path.join(__dirname, "..", ".env") })

export const DFUSE_API_KEY = process.env.DFUSE_API_KEY || ""
export const DFUSE_API_NETWORK = process.env.DFUSE_API_NETWORK || "mainnet"

if (!DFUSE_API_KEY) {
  const messages = [
    "You must define a DFUSE_API_KEY environment variable containing your API Key.",
    "",
    "Visit https://www.dfuse.io to get a free API Key."
  ]

  throw new Error(messages.join("\n"))
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

export function prettifyJson(input: unknown): string {
  return JSON.stringify(input, undefined, 2)
}
