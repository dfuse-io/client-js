import WebSocket from "ws";
import { get_table_deltas, parse_table_deltas, Eosio } from "..";

const origin = "https://github.com/eos-nation/eosws";
const ws = new WebSocket("wss://eosws.mainnet.eoscanada.com/v1/stream", {origin});

ws.onopen = () => {
    ws.send(get_table_deltas("eosio", "eosio", "global"));
};

ws.onmessage = (message) => {
    const table_deltas = parse_table_deltas<Eosio.Table.Global>(message.data);

    if (table_deltas) {
        const { total_ram_stake, total_ram_bytes_reserved } = table_deltas.data.row;
        console.log(total_ram_stake, total_ram_bytes_reserved);
    }
};
