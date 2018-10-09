import { ws } from "./config";
import { get_table_rows, parse_table_rows } from "..";

ws.onopen = () => {
    ws.send(get_table_rows("eosio", "eosio", "voters"));
};

ws.onmessage = (message) => {
    console.log(message.data);
    const table = parse_table_rows<any>(message.data);

    if (table) {
        const {owner, producers, last_vote_weight} = table.data.row;
        console.log(owner, producers, last_vote_weight);
    }
};
