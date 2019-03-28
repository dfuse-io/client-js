import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  InboundMessage,
  InboundMessageType,
  waitFor,
  TableDeltaData
} from "@dfuse/client"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = await client.streamTableRows(
    { code: "eosio", scope: "eosio", table: "global" },
    (message: InboundMessage) => {
      if (message.type !== InboundMessageType.TABLE_DELTA) {
        const { dbop, block_num } = message.data as TableDeltaData
        const { total_ram_stake, total_unpaid_blocks } = dbop.new!.json!

        console.log(
          `Global state change @ #${block_num} [Total RAM Stake ${total_ram_stake}, Total Unpaid Block Count ${total_unpaid_blocks}]`
        )
      }
    }
  )

  await waitFor(5000)
  await stream.unlisten()
}

runMain(main)
