import WebSocket from "ws";
import { get_actions, parse_actions, EosioToken } from "..";

const origin = "https://github.com/eos-nation/eosws";
const ws = new WebSocket("wss://eosws.mainnet.eoscanada.com/v1/stream", {origin});

ws.onmessage = () => {
    ws.send(get_actions("eosio.token", "transfer"));
};

ws.onmessage = (message) => {
    const actions = parse_actions<EosioToken.Transfer.Data>(message.data);

    if (actions) {
        const { from, to, quantity, memo } = actions.data.trace.act.data;
        console.log(from , to, quantity, memo);
    }
};
