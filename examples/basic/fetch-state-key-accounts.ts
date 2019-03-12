import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient } from "@dfuse/eosws-js"

async function main() {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  try {
    const response = await client.stateKeyAccounts(
      "EOS7254KPL1TNuM3dPHeZ5Zqsbgff7gk9UhRrqMfzQZRwami4P4yv"
    )

    console.log("State key accounts response", prettifyJson(response))
  } catch (error) {
    console.log("An error occurred", prettifyJson(error))
  }
}

runMain(main)
