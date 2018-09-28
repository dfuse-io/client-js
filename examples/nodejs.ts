import WebSocket from "ws";
import { get_actions, parse_actions, EosioToken } from "..";

const ws = new WebSocket("ws://35.203.114.193/v1/stream");

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
