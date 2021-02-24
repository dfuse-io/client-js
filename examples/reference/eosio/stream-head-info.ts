import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK, prettifyJson } from "../../config"
import { createDfuseClient, InboundMessage, InboundMessageType, waitFor } from "@dfuse/client"

async function main(): Promise<void> {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK,
  })

  const stream = await client.streamHeadInfo((message: InboundMessage) => {
    if (message.type === InboundMessageType.LISTENING) {
      console.log(prettifyJson(message.data))
      return
    }

    if (message.type === InboundMessageType.HEAD_INFO) {
      console.log(prettifyJson(message.data))
      return
    }
  })

  await waitFor(15000)
  await stream.close()

  client.release()
}

runMain(main)
