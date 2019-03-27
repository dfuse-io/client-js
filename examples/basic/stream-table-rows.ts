import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  InboundMessage,
  InboundMessageType,
  waitFor,
  TableDeltaData
} from "@dfuse/eosws-js"

async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const stream = await client.streamTableRows(
    { code: "eosio", scope: "eosio", table: "global" },
    (message: InboundMessage<any>) => {
      if (message.type !== InboundMessageType.TABLE_DELTA) {
        return
      }

      const { dbop, block_num, step } = message.data as TableDeltaData
      console.log(
        `Table eosio/eosio#global delta operation ${dbop.op}, step: ${step} (Block #${block_num})`
      )
    }
  )

  await waitFor(5000)
  await stream.unlisten()
}

runMain(main)
