export interface ActionTraceData<T> {
  trx_id: string
  idx: number
  depth: number
  trace: ActionTrace<T>
}

export interface ActionTrace<T> {
  receipt: ActionReceipt
  act: Action<T>
  elapsed: number
  cpu_usage: number
  console: string
  total_cpu_usage: number
  trx_id: string
  inline_traces: Array<ActionTrace<any>>
}

export interface Action<T> {
  account: string
  name: string
  authorization: Authorization[]
  data: T
  hex_data: string
}

export interface Authorization {
  actor: string
  permission: string
}

export interface ActionReceipt {
  receiver: string
  act_digest: string
  global_sequence: number
  recv_sequence: number
  auth_sequence: Array<Array<number | string>>
  code_sequence: number
  abi_sequence: number
}
