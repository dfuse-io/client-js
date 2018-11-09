# Changes (per version)

## 0.11.1 (November 9, 2018)

- Fixed README to read `getTransactionLifecycle` in the API section.

## 0.11.0 (November 9, 2018)

### Breaking Changes

- Renamed `EoswsClient.getTransaction` to `EoswsClient.getTransactionLifecycle`.
- Renamed `getTransactionMessage` to `getTransactionLifecycleMessage`.
- Renamed `OutboundMessageType.TRANSACTION` to `OutboundMessageType.TRANSACTION_LIFECYCLE`.

## 0.10.0 (November 9, 2018)

### Breaking Changes

- Removed all previous code, everything has been replaced by a proper `EoswsClient` object.

#### Package

The previous package was mostly released on name `eosws`. The package has been migrated to
our `dfuse` branding instead, so first, you will need to update that.

    yarn remove eosws
    yarn add @dfuse/eosws-js

or using NPM:

    npm uninstall --save @dfuse/eosws-js
    npm install --save @dfuse/eosws-js

#### Listening

Instead of:

    import { get_actions, parse_actions } from '@dfuse/eosws-js'

    const endpoint = 'mainnet.eos.dfuse.io'
    const origin = 'https://example.com'
    const token = '<Paste your API token here>'

    const ws = new WebSocket(`wss://${endpoint}/v1/stream?token=${token}`, { origin })

    ws.onopen = () => {
      ws.send(get_actions({ account: 'eosio.token', action_name: 'transfer' }))
    }

    ws.onmessage = (message) => {
      const actions = parse_actions(message.data)

      if (actions) {
        const { from, to, quantity, memo } = actions.data.trace.act.data
        console.log(from, to, quantity, memo)
      }
    }

You should replace with:

    import { EoswsClient, createEoswsSocket, InboundMessageType } from '@dfuse/eosws-js'

    const endpoint = 'mainnet.eos.dfuse.io'
    const token = '<Paste your API token here>'
    const client = new EoswsClient(createEoswsSocket(() =>
        new WebSocket(`wss://${endpoint}/v1/stream?token=${token}`, { origin: 'https://example.com' })))

    client.connect().then(() => {
        client
            .getActionTraces({ account: 'eosio.token', action_name: 'transfer' })
            onMessage((message) => {
                if (message === InboundMessageType.ACTION_TRACES) {
                    const { from, to, quantity, memo } = message.data.trace.act.data
                    console.log(from, to, quantity, memo)
                }
            })
    })

#### Parsing Messages

This functionality has been removed completely, you will need to make the checking by "hand":

    onMessage = (message) => {
        if (message.type === 'action_trace') {
            console.log('Action trace, do something useful.')
        }
    }

#### Creating Messages

If you only want to create messages, the functionality is still available. Instead of doing:

    get_actions

### Improvements

- Added a proper `EoswsSocket` that automatically re-connects on abnormal closing.
- Added a proper `EoswsClient` to wrap all operations correctly.
- Overhaul of examples and supporting documentation.

## 0.9.2 (October 31, 2018)

- On `get_actions` & `get_table_deltas` only has two params (data parameters & optional parameters) both as defined as Objects.
- On `get_actions`, `receiver` is now optional and defaults to the same value as `account`.
- The `get_table_deltas` request was renamed to `get_table_rows`.
