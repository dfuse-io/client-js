import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient, DfuseClient } from "@dfuse/client"

const account = "eoscanadacom"
const blockNum = 42_500_250

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  try {
    const { balance: atBalance, blockNum: atBlockNum } = await fetchBalance(client, blockNum)
    const { balance: currentBalance, blockNum: currentBlockNum } = await fetchBalance(client)

    console.log(`Your balance at block ${atBlockNum} was ${atBalance}`)
    console.log(`Your current balance at block ${currentBlockNum} is ${currentBalance}`)
  } catch (error) {
    console.log("An error occurred", error)
  }
}

async function fetchBalance(
  client: DfuseClient,
  atBlock?: number
): Promise<{ balance: string; blockNum: number }> {
  const options = { blockNum: atBlock === undefined ? undefined : atBlock }
  const response = await client.stateTable<AccountTableRow>(
    "eosio.token",
    account,
    "accounts",
    options
  )

  return { balance: response.rows[0].json!.balance, blockNum: response.up_to_block_num || blockNum }
}

type AccountTableRow = {
  balance: string
}

runMain(main)
