import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, DfuseClient, DfuseError, DfuseApiError } from "@dfuse/client"

async function main() {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  console.log("Does 'eoscanadacom' exists?", await hasAccount(client, "eoscanadacom"))
  console.log("Does 'eosblahblah' exists?", await hasAccount(client, "bhalbalaseos"))

  client.release()
}

async function hasAccount(client: DfuseClient, account: string): Promise<boolean> {
  const response = await client.stateTable("eosio", account, "userres")

  // If we get at least one row, the account exists, otherwise, it doesn't
  return response.rows.length > 0
}

runMain(main)
