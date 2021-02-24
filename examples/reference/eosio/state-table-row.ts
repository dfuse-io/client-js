import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../../config"
import { createDfuseClient } from "@dfuse/client"

async function main(): Promise<void> {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  try {
    const response = await client.stateTableRow("eosio.token", "eoscanadacom", "accounts", "EOS", {
      keyType: "symbol_code",
    })

    console.log("State table row response", prettifyJson(response))
  } catch (error) {
    console.log("An error occurred", prettifyJson(error))
  }

  client.release()
}

runMain(main)
