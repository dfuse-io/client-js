import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient } from "@dfuse/client"

async function main(): Promise<void> {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  try {
    // This example will work on EOS Mainnet only, change transaction id accordingly to test it out
    const response = await client.fetchTransaction(
      "1d5f57e9392d045ef4d1d19e6976803f06741e11089855b94efcdb42a1a41253"
    )

    console.log("Transaction lifecycle response", prettifyJson(response))
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

runMain(main)
