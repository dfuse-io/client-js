# EOS Webhooks/Websockets

Able to receive a push notification of a transaction (optional Block ID & Traces)

## Websocket example

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

## Related Javascript

- WebSockets (https://github.com/websockets/ws)
- Socket.io (https://github.com/socketio/socket.io)

## Related Video

- Push Irreversible Transaction (https://youtu.be/dO-Le3TTim0?t=34m6s)

## Related Nodeos Plugins

- Watcher & ZeroMQ Nodeos plugin (https://github.com/acoutts/chintai-zeromq-watcher-plugin)
