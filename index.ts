import { ActionTrace } from "./types/action_trace"
import { Ping } from "./types/ping"
import { TableRows } from "./types/table_rows"
export { ActionTrace, Ping, TableRows }

export interface OptionalParams {
  req_id?: string
  start_block?: number
  fetch?: boolean
  with_progress?: boolean
}

/**
 * @typedef {Object} OptionalParams
 * @property {string} req_id An ID that you want sent back to you for any responses related to this request.
 * @property {number} start_block Block at which you want to start processing.
 * It can be an absolute block number, or a negative value, meaning how many blocks from the current head block on the chain.
 * Ex: -2500 means 2500 blocks in the past, relative to the head block.
 * @property {boolean} fetch Whether to fetch an initial snapshot of the requested entity.
 * @property {number} with_progress Frequency of the progress of blocks processing (within the scope of a req_id).
 * You will, at a maximum, receive one notification each 250 milliseconds (when processing large amounts of blocks),
 * and when blockNum % frequency == 0. When you receive a progress notification associated with a stream (again, identified by its req_id),
 * you are guaranteed to have seen all messages produced by that stream, between the previous progress notification and the one received (inclusively).
 */
function handleOptionalParams(base: object, options: OptionalParams) {
  return Object.assign(base, {
    req_id: options.req_id,
    fetch: options.fetch,
    start_block: options.start_block,
    with_progress: options.with_progress
  })
}

/**
 * Data represents the message payload received over the WebSocket.
 *
 * @private
 */
type WebSocketData = string | Buffer | ArrayBuffer | Buffer[]

/**
 * Get Actions
 *
 * @param {object} data Data Parameters
 * @param {string} data.account Contract account targeted by the action.
 * @param {string} [data.receiver] Specify the receiving account executing its smart contract.
 * If left blank, defaults to the same value as `account`.
 * @param {string} [data.action_name] Name of the action called within the account contract.
 * @param {boolean} [data.with_ramops] Stream RAM billing changes and reasons for costs of storage produced by each action.
 * @param {boolean} [data.with_inline_traces] Stream the inline actions produced by each action.
 * @param {boolean} [data.with_deferred] Stream the modifications to deferred transactions produced by each action.
 * @param {OptionalParams} [options={}] Optional Parameters
 * @returns {string} Message for `ws.send`
 * @example
 *
 * ws.send(get_actions({account: "eosio.token", action_name: "transfer"}));
 */
export function get_actions(
  data: {
    account: string
    receiver?: string
    action_name?: string
    with_ramops?: boolean
    with_inline_traces?: boolean
    with_deferred?: boolean
  },
  options: OptionalParams = {}
) {
  return JSON.stringify(
    handleOptionalParams(
      {
        type: "get_actions",
        listen: true,
        data
      },
      options
    )
  )
}

/**
 * Get Transaction
 *
 * Retrieve a transaction and follow its life-cycle. BETA: some life-cycle events are still being rolled out.
 *
 * @param {string} id  The transaction ID you're looking to track.
 * @param {OptionalParams} [options={}] Optional Parameters
 * @returns {string} Message for `ws.send`
 * @example
 *
 * ws.send(get_transaction("517...86d"));
 */
export function get_transaction(id: string, options: OptionalParams = {}) {
  return JSON.stringify(
    handleOptionalParams(
      {
        type: "get_transaction",
        data: { id }
      },
      options
    )
  )
}

/**
 * Get Table Rows
 *
 * Retrieve a stream of changes to the tables, as a side effect of transactions/actions being executed.
 *
 * @param {object} data Data Parameters
 * @param {string} data.code Contract account which wrote to tables.
 * @param {string} data.scope Table scope where table is stored.
 * @param {string} data.table_name Table name, shown in the contract ABI.
 * @param {boolean} [data.json=true] With json=true (or 1), table rows will be decoded to JSON, using the ABIs active on the queried block. This endpoint will thus automatically adapt to upgrades to the ABIs on chain.
 * @param {boolean} [data.verbose] Return the code, table_name, scope and key alongside each row.
 * @param {OptionalParams} [options={}] Optional parameters
 * @returns {string} Message for `ws.send`
 * @example
 *
 * ws.send(get_table_rows({code: "eosio", scope: "eosio", table_name: "global"}));
 */
export function get_table_rows(
  data: {
    code: string
    scope: string
    table_name: string
    json?: boolean
    verbose?: boolean
  },
  options: OptionalParams = {}
) {
  if (data.json === undefined) {
    data.json = true
  }
  return JSON.stringify(
    handleOptionalParams(
      {
        type: "get_table_rows",
        listen: true,
        data
      },
      options
    )
  )
}

/**
 * Unlisten
 *
 * To interrupt a stream, you can `unlisten` with the original `req_id`
 *
 * @param {string} req_id Request ID
 * @example
 *
 * ws.send(unlisten("original-request-id"));
 */
export function unlisten(req_id: string) {
  if (!req_id) {
    throw new Error("req_id is required")
  }

  return JSON.stringify({
    type: "unlisten",
    data: { req_id }
  })
}

/**
 * Generate Req ID
 *
 * @returns {string} Request ID
 * @example
 *
 * generateReqId() // => req123
 */
export function generateReqId() {
  return "req" + Math.round(Math.random() * 1000)
}

/**
 * Parse Actions from `get_actions` from WebSocket `onmessage` listener
 *
 * @param {WebSocketData} data WebSocket Data from message event
 * @param {string} [req_id] Request ID
 * @returns {ActionTrace} Action Trace
 * @example
 *
 * const actions = parse_actions<any>(message);
 */
export function parse_actions<T>(data: WebSocketData, req_id?: string): ActionTrace<T> | null {
  const message = parse_message(data)
  if (message.type === "action_trace") {
    if (req_id && message.req_id !== req_id) {
      return null
    }
    return message
  }
  return null
}

/**
 * Parse Table Deltas from `get_table_rows` from WebSocket `onmessage` listener
 *
 * @param {WebSocketData} data WebSocket Data from message event
 * @param {string} [req_id] Request ID
 * @returns {ActionTrace} Action Trace
 * @example
 *
 * const table_deltas = parse_table_rows<any>(message);
 */
export function parse_table_rows<T>(data: WebSocketData, req_id?: string): TableRows<T> | null {
  const message = parse_message(data)
  if (message.type === "table_rows" || message.type === "table_delta") {
    if (req_id && message.req_id !== req_id) {
      return null
    }
    return message
  }
  return null
}

/**
 * Parse Ping from WebSocket `onmessage` listener
 *
 * @param {WebSocketData} data WebSocket Data from message event
 * @returns {Ping} Ping
 * @example
 *
 * const ping = parse_ping(message);
 */
export function parse_ping(data: WebSocketData): Ping | null {
  const message = parse_message(data)
  if (message.type === "ping") {
    return message
  }
  return null
}

/**
 * Parse MessageEvent from WebSocket `onmessage` listener
 *
 * @private
 * @param {WebSocketData} data WebSocket Data from message event
 * @returns {Object} Message Data
 */
export function parse_message(data: WebSocketData): any {
  return JSON.parse(data.toString())
}
