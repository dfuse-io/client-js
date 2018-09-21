import WebSocket from "ws";
import { generateReqId, get_actions, get_table_deltas, unlisten } from "./utils";

export default class EosWebSocket extends WebSocket {
  /**
   * @name EosWebSocket
   * @example
   *
   * const eosws = new EosWebSocket("ws://<SERVER>/v1/stream");
   */
  constructor(address: string, options: WebSocket.ClientOptions = {perMessageDeflate: false}) {
    if (!options.origin) { options.origin = "https://github.com/EOS-Nation/eos-websocket"; }
    super(address, options);
  }

  /**
   * @example
   *
   * eosws.unlisten("req123");
   */
  public unlisten(req_id: string) {
    this.send(JSON.stringify(unlisten(req_id)));
  }

  /**
   * Get Actions
   *
   * @param {string} account Account
   * @param {string} action_name Action Name
   * @param {string} [receiver] Receiver
   * @returns {string} req_id
   * @example
   *
   * eosws.get_actions("eosio.token", "transfer");
   */
  public get_actions(account: string, action_name: string, receiver?: string) {
    const req_id = generateReqId();
    this.send(JSON.stringify(get_actions(req_id, account, action_name, receiver)));
    return req_id;
  }

  /**
   * Get Table Deltas
   *
   * @param {string} code Code
   * @param {string} scope Scope
   * @param {string} table_name Table Name
   * @example
   *
   * eosws.get_table_deltas("eosio", "eosio", "global");
   */
  public get_table_deltas(code: string, scope: string, table_name: string) {
    const req_id = generateReqId();
    this.send(JSON.stringify(get_table_deltas(req_id, code, scope, table_name)));
    return req_id;
  }
}
