import { ActionTrace, Ping, TableDelta } from "./types";
export * from "./types";

/**
 * Data represents the message payload received over the WebSocket.
 *
 * @private
 */
type WebSocketData = string | Buffer | ArrayBuffer | Buffer[];

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
export function get_actions(account: string, action_name: string, receiver?: string, req_id?: string) {
    if (!req_id) { req_id = generateReqId(); }
    if (!receiver) { receiver = account; }

    return JSON.stringify({
        type: "get_actions",
        req_id,
        listen: true,
        data: {
            account,
            action_name,
            receiver,
        },
    });
}

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
 * ws.send(get_transaction(""));
 */
export function get_transaction(account: string, action_name: string, receiver?: string, req_id?: string) {
    if (!req_id) { req_id = generateReqId(); }
    if (!receiver) { receiver = account; }

    return JSON.stringify({
        type: "get_actions",
        req_id,
        listen: true,
        data: {
            account,
            action_name,
            receiver,
        },
    });
}

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
export function get_table_deltas(code: string, scope: string, table_name: string, req_id?: string) {
    if (!req_id) { req_id = generateReqId(); }

    return JSON.stringify({
        type: "get_table_deltas",
        req_id,
        listen: true,
        data: {
            code,
            scope,
            table_name,
            json: true,
        },
    });
}

/**
 * Unlisten to WebSocket based on request id
 *
 * @param {string} req_id Request ID
 * @example
 *
 * ws.send(unlisten("req123"));
 */
export function unlisten(req_id: string) {
    if (!req_id) { throw new Error("req_id is required"); }

    return JSON.stringify({
        type: "unlisten",
        data: {
            req_id,
        },
    });
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
    return "req" + Math.round(Math.random() * 1000);
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
    const message = parse_message(data);
    if (message.type === "action_trace") {
        if (req_id && message.req_id !== req_id) { return null; }
        return message;
    }
    return null;
}

/**
 * Parse Table Deltas from `get_table_deltas` from WebSocket `onmessage` listener
 *
 * @param {WebSocketData} data WebSocket Data from message event
 * @param {string} [req_id] Request ID
 * @returns {ActionTrace} Action Trace
 * @example
 *
 * const table_deltas = parse_table_deltas<any>(message);
 */
export function parse_table_deltas<T>(data: WebSocketData, req_id?: string): TableDelta<T> | null {
    const message = parse_message(data);
    if (message.type === "table_delta") {
        if (req_id && message.req_id !== req_id) { return null; }
        return message;
    }
    return null;
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
    const message = parse_message(data);
    if (message.type === "ping") { return message; }
    return null;
}

/**
 * Parse MessageEvent from WebSocket `onmessage` listener
 *
 * @private
 * @param {WebSocketData} data WebSocket Data from message event
 * @returns {Object} Message Data
 */
export function parse_message(data: WebSocketData): any {
    return JSON.parse(data.toString());
}
