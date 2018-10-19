/// <reference types="node" />
import { ActionTrace } from "./types/action_trace";
import { Ping } from "./types/ping";
import { TableRows } from "./types/table_rows";
export { ActionTrace, Ping, TableRows };
/**
 * Data represents the message payload received over the WebSocket.
 *
 * @private
 */
declare type WebSocketData = string | Buffer | ArrayBuffer | Buffer[];
/**
 * Get Actions
 *
 * @param {string} account Account
 * @param {string} [action_name] Action Name
 * @param {string} [receiver] Receiver
 * @param {string} [options.req_id] Request ID
 * @param {number} [options.start_block] Start at block number
 * @param {boolean} [options.fetch] Fetch initial request
 * @returns {string} Message for `ws.send`
 * @example
 *
 * ws.send(get_actions("eosio.token", "transfer"));
 */
export declare function get_actions(account: string, action_name?: string, receiver?: string, options?: {
    req_id?: string;
    start_block?: number;
    fetch?: boolean;
}): string;
/**
 * Get Transaction (NOT STABLE YET)
 *
 * @private
 * @param {string} account Account
 * @param {string} action_name Action Name
 * @param {string} [receiver] Receiver
 * @param {object} [options={}] Optional parameters
 * @param {string} [options.req_id] Request ID
 * @param {number} [options.start_block] Start at block number
 * @param {boolean} [options.fetch] Fetch initial request
 * @returns {string} Message for `ws.send`
 * @example
 *
 * ws.send(get_transaction("517...86d"));
 */
export declare function get_transaction(trx_id: string, options?: {
    req_id?: string;
    start_block?: number;
    fetch?: boolean;
}): string;
/**
 * Get Table Deltas
 *
 * @param {string} code Code
 * @param {string} scope Scope
 * @param {string} table_name Table Name
 * @param {object} [options={}] Optional parameters
 * @param {string} [options.req_id] Request ID
 * @param {number} [options.start_block] Start at block number
 * @param {boolean} [options.fetch] Fetch initial request
 * @returns {string} Message for `ws.send`
 * @example
 *
 * ws.send(get_table_rows("eosio", "eosio", "global"));
 */
export declare function get_table_rows(code: string, scope: string, table_name: string, options?: {
    req_id?: string;
    start_block?: number;
    fetch?: boolean;
}): string;
/**
 * Unlisten to WebSocket based on request id
 *
 * @param {string} req_id Request ID
 * @example
 *
 * ws.send(unlisten("req123"));
 */
export declare function unlisten(req_id: string): string;
/**
 * Generate Req ID
 *
 * @returns {string} Request ID
 * @example
 *
 * generateReqId() // => req123
 */
export declare function generateReqId(): string;
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
export declare function parse_actions<T>(data: WebSocketData, req_id?: string): ActionTrace<T> | null;
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
export declare function parse_table_rows<T>(data: WebSocketData, req_id?: string): TableRows<T> | null;
/**
 * Parse Ping from WebSocket `onmessage` listener
 *
 * @param {WebSocketData} data WebSocket Data from message event
 * @returns {Ping} Ping
 * @example
 *
 * const ping = parse_ping(message);
 */
export declare function parse_ping(data: WebSocketData): Ping | null;
/**
 * Parse MessageEvent from WebSocket `onmessage` listener
 *
 * @private
 * @param {WebSocketData} data WebSocket Data from message event
 * @returns {Object} Message Data
 */
export declare function parse_message(data: WebSocketData): any;
