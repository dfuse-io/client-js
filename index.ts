import WebSocket from "ws";
import { generateReqId, get_actions, get_table_deltas, unlisten } from "./src/utils";

export default class EosWebSocket extends WebSocket {
  public req_id: string;

  /**
   * @name EosWebSocket
   * @example
   *
   * const ws = new EosWebSocket("ws://<SERVER>/v1/stream");
   */
  constructor(address: string, options: WebSocket.ClientOptions = {perMessageDeflate: false}) {
    if (!options.origin) { options.origin = "https://github.com/EOS-Nation/eos-websocket"; }
    super(address, options);
    this.req_id = generateReqId();
  }
  /**
   * @example
   *
   * ws.unlisten();
   */
  public unlisten() {
    this.send(JSON.stringify(unlisten(this.req_id)));
  }

  /**
   * Get Actions
   *
   * @param {string} account Account
   * @param {string} action_name Action Name
   * @param {string} [receiver] Receiver
   * @example
   *
   * ws.get_actions("eosio.token", "transfer");
   */
  public get_actions(account: string, action_name: string, receiver?: string) {
    this.send(JSON.stringify(get_actions(this.req_id, account, action_name, receiver)));
  }
  /**
   * Get Table Deltas
   *
   * @param {string} code Code
   * @param {string} scope Scope
   * @param {string} table_name Table Name
   * @example
   *
   * ws.get_table_deltas("eosio", "eosio", "global");
   */
  public get_table_deltas(code: string, scope: string, table_name: string) {
    this.send(JSON.stringify(get_table_deltas(this.req_id, code, scope, table_name)));
  }
}
