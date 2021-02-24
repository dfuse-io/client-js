import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../../config"
import { createDfuseClient, DfuseClient } from "@dfuse/client"

async function main(): Promise<void> {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  console.log("Does 'eoscanadacom' exist?", await hasAccount(client, "eoscanadacom"))
  console.log("Does 'eosblahblah' exist?", await hasAccount(client, "eosblahblah"))

  client.release()
}

async function hasAccount(client: DfuseClient, account: string): Promise<boolean> {
  const response = await client.stateTable("eosio", account, "userres")

  // If we get at least one row, the account exists. Otherwise, it doesn't.
  return response.rows.length > 0
}

runMain(main)
