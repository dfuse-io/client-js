import { DFUSE_API_KEY, runMain, prettifyJson, DFUSE_API_NETWORK } from "../config"
import { createDfuseClient } from "@dfuse/client"

/**
 * The dfuse EOS API proxies most of the standard EOS Chain API RPC calls to
 * public nodes. The `dfuseClient.apiRequest` can be used to query
 * those endpoints. For example, the `/v1/chain/get_info` call or any other
 * EOS Chain RPC calls https://developers.eos.io/eosio-nodeos/reference#chain.
 *
 * You can provide query params, body and headers to the request. However, they
 * are not built-in to the client for us to avoid having to support them directly
 * with types and all.
 */
async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: "worbli"
  })

  try {
    const response = await client.apiRequest("/v1/chain/get_info", "GET")

    console.log("Chain info response", prettifyJson(response))
  } catch (error) {
    console.log("An error occurred", error)
  }

  client.release()
}

runMain(main)
