import EosWebSocket from "../";

const ws = new EosWebSocket("ws://35.203.114.193/v1/stream");

ws.on("open", () => {
    ws.get_table_deltas("eosio", "eosio", "global");
});

ws.on("message", (message) => {
    console.log(JSON.stringify(JSON.parse(message.toString()), null, 4));
});
