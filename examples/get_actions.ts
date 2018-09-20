import EosWebSocket from "../";

const ws = new EosWebSocket("ws://35.203.114.193/v1/stream");

ws.on("open", () => {
    ws.get_actions("eosio.token", "transfer");
    ws.get_actions("eosio", "delegatebw");
    ws.get_actions("eosio", "undelegatebw");
});

ws.on("message", (message) => {
    console.log(JSON.stringify(JSON.parse(message.toString()), null, 4));
});
