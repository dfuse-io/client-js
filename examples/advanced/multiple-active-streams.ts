import { DFUSE_API_KEY, runMain, DFUSE_API_NETWORK } from "../config"
import {
  createDfuseClient,
  InboundMessage,
  waitFor,
  Stream,
  dynamicMessageDispatcher,
  ListeningInboundMessage,
  ActionTraceInboundMessage,
  OnStreamMessage
} from "@dfuse/client"

type BuyRamBytesData = {
  bytes: number
  receiver: string
  payer: string
}

type TransferData = {
  from: string
  to: string
  quantity: string
  memo: string
}

/**
 * In this example, we showcase how to have multiple streams active
 * at the same time. We will listen for `eosio` `buyrambytes` action
 * on one stream on `eosio.token` `transfer` notification performed
 * on receiver `eosio.ram`.
 *
 * We will also show the differences and impacts of having two separate
 * streams instead of a single one by implementing a sinle stream that
 * listens for both actions one pass.
 *
 * You will learn how to have multiple active streams, that multiple
 * active streams are independent from each other and ordering of messages
 * across streams is not guaranteed.
 *
 * You will also see how to workaround this problem in some circumstances
 * by creating a merged stream filtering required messages from
 * a pool of possibilities. Having a single stream will alwyas guaranteed
 * ordering of messages.
 */
async function main() {
  const client = createDfuseClient({
    apiKey: DFUSE_API_KEY,
    network: DFUSE_API_NETWORK
  })

  const buyRamData = { accounts: "eosio", action_names: "buyrambytes" }
  const buyRamStream: Stream = await client.streamActionTraces(
    buyRamData,
    dynamicMessageDispatcher({
      listening: onListeningFactory("buy_ram"),
      action_trace: onBuyRamAction
    })
  )

  const ramData = { accounts: "eosio.token", action_names: "transfer", receivers: "eosio.ram" }
  const ramStream: Stream = await client.streamActionTraces(
    ramData,
    dynamicMessageDispatcher({
      listening: onListeningFactory("ram_transfer"),
      action_trace: onTransferToEosioRamAction
    })
  )

  console.log(
    "Notice how `Buy RAM` and `RAM cost` happens in random order, due to using 2 independent streams."
  )
  await waitFor(60000)
  await buyRamStream.close()
  await ramStream.close()

  console.log("")

  const mergedData = {
    accounts: "eosio|eosio.token",
    action_names: "buyrambytes|transfer",
    receivers: "eosio|eosio.token|eosio.ram"
  }
  const mergedStream: Stream = await client.streamActionTraces(
    mergedData,
    dynamicMessageDispatcher({
      listening: onListeningFactory("merged"),
      action_trace: onMergedAction
    })
  )

  console.log(
    "Notice how `Buy RAM` is always before `RAM cost` thanks to strict ordering of a single stream."
  )
  await waitFor(60000)
  await mergedStream.close()

  console.log("Completed")
}

function onListeningFactory(tag: string): OnStreamMessage {
  return () => {
    console.log(`Stream [${tag}] is now listening.`)
  }
}

function onBuyRamAction(message: ActionTraceInboundMessage<BuyRamBytesData>) {
  const data = message.data.trace.act.data
  console.log(`Buy RAM: ${data.payer} pays ${data.bytes} bytes to ${data.receiver}`)
}

function onTransferToEosioRamAction(message: ActionTraceInboundMessage<TransferData>) {
  const data = message.data.trace.act.data
  console.log(`RAM cost: ${data.from} pays ${data.quantity} for the RAM`)
}

/**
 * This is coming from a stream with multiple possibilities. The default
 * logic is that you will receive any action matching one of the various
 * combination of forming the three parameters `account/action/receiver`.
 *
 * In most use cases, you are caring really about a subset of the
 * combinations, like in our example here where we are caring about
 * only two possibility.
 *
 * When using a merged stream, you have a strict ordering of the
 * action as they appear on the chain, in the correct order. So
 * buy ram will come in after `eosio.ram` transfer action (as our
 * current `newaccount` action is implemented, might be different in
 * the future on a different side/siste chain).
 */
function onMergedAction(message: ActionTraceInboundMessage) {
  const action = message.data.trace.act
  if (action.account === "eosio" && action.name === "buyrambytes") {
    onBuyRamAction(message as ActionTraceInboundMessage<BuyRamBytesData>)
    return
  }

  if (
    action.account === "eosio.token" &&
    action.name === "transfer" &&
    message.data.trace.receipt.receiver === "eosio.ram"
  ) {
    onTransferToEosioRamAction(message as ActionTraceInboundMessage<TransferData>)
    return
  }

  // We don't care about any other possibilities, so let's discard them
}

runMain(main)
