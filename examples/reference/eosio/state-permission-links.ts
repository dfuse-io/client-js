import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../../config"
import { createDfuseClient } from "@dfuse/client"

async function main(): Promise<void> {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  try {
    const response = await client.statePermissionLinks("eoscanadacom")

    console.log("State permission links response", prettifyJson(response))
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

runMain(main)
