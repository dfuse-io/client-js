import { ws } from "./config";
import { get_actions, parse_actions } from "..";

ws.onopen = () => {
    ws.send(get_actions("eosio.token", "transfer", "eosbetdice11"));
};

ws.onmessage = (message) => {
    const actions = parse_actions<any>(message.data);

    if (actions) {
        const { from, to, quantity, memo } = actions.data.trace.act.data;
        console.log(from , to, quantity, memo);
    }
};
