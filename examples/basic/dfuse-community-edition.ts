import { runMain } from "../config"
import { createDfuseClient } from "@dfuse/client"

type AccountTableRow = {
  balance: string
}

async function main() {
  // Here what you need to connect to the dfuse Community Edition hosted by EOS Nation
  const client = createDfuseClient({
    network: "kylin.dfuse.eosnation.io",
    authentication: false
  })

  try {
    const response = await client.stateTable<AccountTableRow>("eosio.token", "eosio", "accounts")
    const balance = response.rows[0].json!.balance
    const atBlockNum = response.up_to_block_num

    console.log(`Your balance at block ${atBlockNum} is ${balance}`)
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

runMain(main)
