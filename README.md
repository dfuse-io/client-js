# EOS Webhooks/Websockets

Able to receive a push notification of a transaction (optional Block ID & Traces)

## Websocket example

Listen for all transactions from a particular contract (scope)

```
ws://<SERVER>/v1/transaction/eosio.token
```

Listen for all transactions from a particular contract (scope) & action

```
ws://<SERVER>/v1/transaction/eosio.token/transer
```

## Webhooks

## Related Video

- Push Irreversible Transaction (https://youtu.be/dO-Le3TTim0?t=34m6s)

## Related Nodeos Plugins

- https://github.com/acoutts/chintai-zeromq-watcher-plugin
