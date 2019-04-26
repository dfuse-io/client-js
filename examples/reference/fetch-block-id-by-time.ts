import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  try {
    // Equivalent with arguments (new Date("2019-03-04T10:36:14.6Z"), "gte")
    const response = await client.fetchBlockIdByTime("2019-03-04T10:36:14.6Z", "gt")

    console.log("Block id by time response", prettifyJson(response))
  } catch (error) {
    console.log("An error occurred", error)
  }
}

runMain(main)
