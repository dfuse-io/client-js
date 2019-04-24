import { TransactionLifecycle } from "../../types/transaction"
import { ActionTrace } from "../../types/action-trace"
import { flattenActionTraces, matchingActionTraces } from "../transaction"

describe("flattenActions", () => {
  it("flattens action traces correctly", () => {
    const transaction = createTransaction([
      createActionTrace("eosio.token/eosio.token:transfer", [
        createActionTrace("from/eosio.token:transfer", [
          createActionTrace("contractX/contractX:log")
        ]),
        createActionTrace("to/eosio.token:transfer", [
          createActionTrace("contractY/contractY:update")
        ])
      ])
    ])

    const toTriplet = (actionTrace: ActionTrace<any>): string =>
      `${actionTrace.receipt.receiver}/${actionTrace.act.account}:${actionTrace.act.name}`

    expect(flattenActionTraces(transaction).map(toTriplet)).toEqual([
      "eosio.token/eosio.token:transfer",
      "from/eosio.token:transfer",
      "contractX/contractX:log",
      "to/eosio.token:transfer",
      "contractY/contractY:update"
    ])
  })
})

describe("matchingActions", () => {
  it("extracts matching action traces correctly", () => {
    const transaction = createTransaction([
      createActionTrace("eosio.token/eosio.token:transfer", [
        createActionTrace("from/eosio.token:transfer", [
          createActionTrace("contractX/contractX:log")
        ]),
        createActionTrace("to/eosio.token:transfer", [
          createActionTrace("contractY/contractY:update")
        ])
      ])
    ])

    const toTriplet = (actionTrace: ActionTrace<any>): string =>
      `${actionTrace.receipt.receiver}/${actionTrace.act.account}:${actionTrace.act.name}`

    expect(matchingActionTraces({ lifecycle: transaction, action_idx: [] }).map(toTriplet)).toEqual(
      []
    )

    expect(
      matchingActionTraces({ lifecycle: transaction, action_idx: [0, 2, 4] }).map(toTriplet)
    ).toEqual([
      "eosio.token/eosio.token:transfer",
      "contractX/contractX:log",
      "contractY/contractY:update"
    ])

    expect(
      matchingActionTraces({ lifecycle: transaction, action_idx: [0, 1, 2, 3, 4] }).map(toTriplet)
    ).toEqual([
      "eosio.token/eosio.token:transfer",
      "from/eosio.token:transfer",
      "contractX/contractX:log",
      "to/eosio.token:transfer",
      "contractY/contractY:update"
    ])
  })
})

function createTransaction(actionTraces: ActionTrace<any>[]): TransactionLifecycle {
  return {
    id: "123",
    transaction_status: "executed",
    execution_block_header: {
      confirmed: 1,
      producer: "eosio",
      action_mroot: "",
      transaction_mroot: "",
      previous: "",
      timestamp: "",
      header_extensions: [],
      new_producers: null,
      schedule_version: 1
    },
    cancelation_irreversible: false,
    creation_irreversible: false,
    execution_irreversible: true,
    pub_keys: [],
    transaction: {} as any,
    execution_trace: {
      id: "123",
      scheduled: false,
      block_num: 1,
      block_time: "",
      elapsed: 10,
      net_usage: 10,
      action_traces: actionTraces
    }
  }
}

function createActionTrace(
  triplet: string,
  childActionTraces?: ActionTrace<any>[]
): ActionTrace<any> {
  const receiverActionParts = triplet.split("/", 2)
  const actionParts = receiverActionParts[1].split(":", 2)

  return {
    act: {
      account: actionParts[0],
      name: actionParts[1],
      data: {}
    },
    block_num: 1,
    block_time: "",
    console: "",
    elapsed: 0,
    context_free: false,
    receipt: {
      abi_sequence: 1,
      act_digest: "",
      auth_sequence: [],
      code_sequence: 1,
      recv_sequence: 1,
      global_sequence: 2,
      receiver: receiverActionParts[0]
    },
    trx_id: "123",
    inline_traces: childActionTraces
  }
}
