import WebSocket from "ws";

export default class EosWebSocket extends WebSocket {
  public req_id: string;

  /**
   * @example
   *
   * const ws = new EosWebSocket("ws://<SERVER>/v1/stream");
   */
  constructor (address: string, options: WebSocket.ClientOptions = {perMessageDeflate: false}) {
    if (!options.origin) { options.origin = 'https://github.com/EOS-Nation/eos-websocket'; }
    super(address, options);
    this.req_id = generateReqId();
  }
  public unlisten() {
    this.send(JSON.stringify(unlisten(this.req_id)));
  }
  public get_actions(account: string, action_name: string, receiver?: string) {
    this.send(JSON.stringify(get_actions(account, action_name, receiver, this.req_id)));
  }
  public get_table_deltas(code: string, scope: string, table_name: string) {
    this.send(JSON.stringify(get_table_deltas(code, scope, table_name, this.req_id)));
  }
}

export function generateReqId() {
  return "req" + Math.round(Math.random() * 1000);
}

export function unlisten(req_id: string) {
  return {
    type: "unlisten",
    data: {
      req_id
    }
  };
}

export function get_actions(account: string, action_name: string, receiver?: string, req_id?: string) {
  return {
    type: "get_actions",
    req_id,
    listen: true,
    data: {
      account,
      action_name,
      receiver: receiver || account,
    }
  }
}

export function get_table_deltas(code: string, scope: string, table_name: string, req_id?: string) {
  return {
    type: "get_table_deltas",
    req_id,
    listen: true,
    data: {
      code,
      scope,
      table_name,
      json: true
    }
  }
}
