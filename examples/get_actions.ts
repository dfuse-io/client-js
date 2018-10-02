import WebSocket from "ws";
import { get_actions, parse_actions, EosioToken } from "..";

function connect() {
    const origin = "https://github.com/eos-nation/eosws";
    const ws = new WebSocket("wss://eosws.mainnet.eoscanada.com/v1/stream", {origin});

    ws.onopen = () => {
        console.log("OPEN");
        ws.send(get_actions("eosio.token", "transfer", "eosbetdice11"));
    };

    ws.onmessage = (message) => {
        const actions = parse_actions<EosioToken.Transfer.Data>(message.data);

        if (actions) {
            const { from, to, quantity, memo } = actions.data.trace.act.data;
            console.log(from , to, quantity, memo);
        }
    };

    ws.onclose = () => {
        console.log("CLOSE");
        connect();
    };
}

connect();
