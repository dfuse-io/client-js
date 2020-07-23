// tslint:disable: no-var-requires
import * as path from "path"
import dotenv from "dotenv"

// Only used to ensure client library and examples free all handles, you
// do not need this in your own project (but don't hesitate to use it if you
// find it useful though).
if (process.env.DEBUG_LEAKED_HANDLES) {
  require("leaked-handles").set({
    fullStack: true,
    debugSockets: true
  })
}

// The two instructions below are there to alter the global scope of Node.js
// adding to it the `fetch` and `WebSocket` variables. The library by default
// will pick these variables when present on the global scope, reducing the
// amount of configuration to perform, specially in Browswer environment where
// those two variables are present out of the box.
//
// If you project is a web application or react native mobile application,
// this import is not required (as `fetch` is already available there in the
// global scope).
//
// If your project targets a Node.js environment (server), you have the options
// to alter the global scope just like below. You can also avoid polluting the
// global scope by providing the variables as configuration options of the
// dfuse Client.
//
// Check [Configure Node.js](https://github.com/dfuse-io/client/blob/master/README.md#node-js)
// section of the read me for further explanation around this topic.
//
;(global as any).fetch = require("unfetch")
;(global as any).WebSocket = require("isomorphic-ws")

// You don't require to have this configuration and the associated import
// in your own project (of course, feel free to copy it if you think it helps).
//
// Simply provide the various options of the example(s) hard-coded in your
// code and pull from other configuration storage instances.
//
// **Note** Does not work in a Browser environment
dotenv.config({ path: path.join(__dirname, "..", ".env") })

export const DFUSE_API_KEY = process.env.DFUSE_API_KEY || ""
export const DFUSE_API_NETWORK = process.env.DFUSE_API_NETWORK || "mainnet.eos.dfuse.io"

if (!DFUSE_API_KEY) {
  const messages = [
    "You must define a DFUSE_API_KEY environment variable containing your dfuse API Key.",
    "",
    "Visit https://app.dfuse.io to register for a free API Key."
  ]

  throw new Error(messages.join("\n"))
}

export function runMain(runner: () => Promise<void>) {
  /**
   * Helper to display `unhandledRejection` rejection errors.
   */
  process.on("unhandledRejection", (error) => {
    const messages = [
      "An unhandled rejection error has been catched at the process level. This is",
      "completely wrong and should never happen in the examples. If you see this behavior,",
      "there is probably something very fishy.",
      "",
      "You should log a bug report if you see this error, attach the debug output by",
      "using `DEBUG='dfuse:*' yarn run:example ...`.",
      "",
      "Read about unhandle rejection error https://stackoverflow.com/q/40500490/697930",
      ""
    ]

    console.error(messages.join("\n"))
    console.error(error)

    throw error
  })

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
