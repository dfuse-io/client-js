import WebSocket from "ws";
import { get_table_deltas, parse_table_deltas, Eosio } from "..";

const ws = new WebSocket("ws://35.203.114.193/v1/stream");

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
