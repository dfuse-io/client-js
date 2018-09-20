/**
 * Generate Req ID
 *
 * @private
 * @returns {string} Req ID
 * @example
 *
 * genereateReq() // => req123
 */
export function generateReqId() {
    return "req" + Math.round(Math.random() * 1000);
}

export function unlisten(req_id: string) {
    return {
        type: "unlisten",
        data: {
            req_id,
        },
    };
}

export function get_actions(req_id: string, account: string, action_name: string, receiver?: string) {
    return {
        type: "get_actions",
        req_id,
        listen: true,
        data: {
            account,
            action_name,
            receiver: receiver || account,
        },
    };
}

export function get_table_deltas(req_id: string, code: string, scope: string, table_name: string) {
    return {
        type: "get_table_deltas",
        req_id,
        listen: true,
        data: {
            code,
            scope,
            table_name,
            json: true,
        },
    };
}
