import { ws } from "./config";
import { get_transaction } from "..";

ws.onopen = () => {
    ws.send(get_transaction("d9e98cec9fcb5604da38ca250eb22246520bfeee2c35298032c2fbb825eb406d", {fetch: true}));
};

ws.onmessage = (message) => {
    console.log(message.data);
};
