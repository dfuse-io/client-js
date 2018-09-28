/// <reference types="node" />
import { ActionTrace, Ping, TableDelta } from "./types";
export * from "./types";
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
 * @param {string} action_name Action Name
 * @param {string} [receiver] Receiver
 * @param {string} [req_id] Request ID
 * @returns {string} Message for `ws.send`
 * @example
 *
 * ws.send(get_actions("eosio.token", "transfer"));
 */
export declare function get_actions(account: string, action_name: string, receiver?: string, req_id?: string): string;
/**
 * Get Table Deltas
 *
 * @param {string} code Code
 * @param {string} scope Scope
 * @param {string} table_name Table Name
 * @param {string} [req_id] Request ID
 * @returns {string} Message for `ws.send`
 * @example
 *
 * ws.send(get_table_deltas("eosio", "eosio", "global"));
 */
export declare function get_table_deltas(code: string, scope: string, table_name: string, req_id?: string): string;
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
 * @returns {ActionTrace} Action Trace
 * @example
 *
 * const actions = parse_actions<any>(message);
 */
export declare function parse_actions<T>(data: WebSocketData): ActionTrace<T> | null;
/**
 * Parse Table Deltas from `get_table_deltas` from WebSocket `onmessage` listener
 *
 * @param {WebSocketData} data WebSocket Data from message event
 * @returns {ActionTrace} Action Trace
 * @example
 *
 * const table_deltas = parse_table_deltas<any>(message);
 */
export declare function parse_table_deltas<T>(data: WebSocketData): TableDelta<T> | null;
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
