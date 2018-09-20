# EOS Websockets/Webhooks

Able to receive a push notification of a transaction (optional Block ID & Traces)

## Install

**npm**

```
$ npm install --save eos-websocket
```

## Javascript

```javascript
import EosWebSocket from "eos-websocket";

const ws = new EosWebSocket("ws://35.203.114.193/v1/stream");

ws.on('open', () => {
    ws.get_table_deltas("eosio", "eosio", "global");
    ws.get_actions("eosio.token", "transfer");
})

ws.on("message", message => {
    console.log(message);
})
```

## Websocket

Listen for all transactions from a particular contract (scope)

```
ws://<SERVER>/v1/transaction/<SCOPE>
ws://<SERVER>/v1/transaction/eosio.token
```

Listen for all transactions from a particular contract (scope) & action

```
ws://<SERVER>/v1/transaction/<SCOPE>/<ACTION>
ws://<SERVER>/v1/transaction/eosio.token/transer
```

## Types of Notifications

1) websocket (and/or socket.io)
2) web hook (we poke your API on trigger)
3) long polling API (eosjs compatible) on steroids

## Related Javascript

- WebSockets (https://github.com/websockets/ws)
- Socket.io (https://github.com/socketio/socket.io)

## Related Video

- Push Irreversible Transaction (https://youtu.be/dO-Le3TTim0?t=34m6s)

## Related Nodeos Plugins

- Watcher & ZeroMQ Nodeos plugin (https://github.com/acoutts/chintai-zeromq-watcher-plugin)
