export * from "./client"
export * from "./types/action_trace"
export * from "./types/ping"
export * from "./types/table_rows"
export * from "./types/transaction"
export * from "./streamers/common"
export * from "./streamers/info-streamer"

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
 * Parse MessageEvent from WebSocket `onmessage` listener
 *
 * @private
 * @param {WebSocketData} data WebSocket Data from message event
 * @returns {Object} Message Data
 */
export function parse_message(data: WebSocketData): any {
  return JSON.parse(data.toString())
}
