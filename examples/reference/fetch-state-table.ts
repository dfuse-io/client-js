import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  try {
    const response = await client.stateTable("eosio", "eoscanadacom", "delband")

    console.log("State table response", prettifyJson(response))
  } catch (error) {
    console.log("An error occurred", prettifyJson(error))
  }
}

runMain(main)
