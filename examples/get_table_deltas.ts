import WebSocket from "ws";
import { get_table_deltas, parse_table_deltas, generateReqId } from "..";
import { Voters } from "../types/eosio/table";

const origin = "https://github.com/eos-nation/eosws";
const ws = new WebSocket("wss://eosws.mainnet.eoscanada.com/v1/stream", {origin});
const voters_req_id = generateReqId();

ws.onopen = () => {
    ws.send(get_table_deltas("eosio", "eosio", "voters", {req_id: voters_req_id, fetch: true}));
};

ws.onmessage = (message) => {
    const voters = parse_table_deltas<Voters>(message.data, voters_req_id);

    if (voters) {
        const voter = voters.data.row;
        console.log(voter);
    }
};
