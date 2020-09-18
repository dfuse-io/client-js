import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient } from "@dfuse/client"

async function main(): Promise<void> {
  const client = createDfuseClient({ apiKey: DFUSE_API_KEY, network: DFUSE_API_NETWORK })

  try {
    const hexRows = [
      "202932c94c833055202932c94c833055701101000000000004454f5300000000109802000000000004454f5300000000",
      "202932c94c833055802b35c94c833055102700000000000004454f5300000000102700000000000004454f5300000000",
      "202932c94c83305550ab49525fba3055a08601000000000004454f5300000000a08601000000000004454f5300000000",
    ]

    const response = await client.stateAbiBinToJson("eosio", "delband", hexRows)

    console.log("State ABI bin -> json response", prettifyJson(response))
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

runMain(main)
