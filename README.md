# `eosws` JavaScript/TypeScript bindings (from the [dfuse API](https://dfuse.io/))

WebSocket consumer for the <https://dfuse.io> API on EOS networks.

## Installation

Using Yarn:

    yarn add @dfuse/eosws-js

or using NPM:

    npm install --save @dfuse/eosws-js

## Quick Start

When targeting a browser (you will need a bundler like Webpack since we only ship ES5 modules files for now):

```js
const { EoswsClient, createEoswsSocket, InboundMessageType } = require("@dfuse/eosws-js")

const endpoint = "mainnet.eos.dfuse.io"
const token = "<Paste your API token here>"
const client = new EoswsClient(
  createEoswsSocket(
    () =>
      new WebSocket(`wss://${endpoint}/v1/stream?token=${token}`, { origin: "https://example.com" })
  )
)

client
  .connect()
  .then(() => {
    client
      .getActionTraces({ account: "eosio.token", action_name: "transfer" })
      .onMessage((message) => {
        if (message.type === InboundMessageType.ACTION_TRACE) {
          const { from, to, quantity, memo } = message.data.trace.act.data
          console.log(from, to, quantity, memo)
        }
      })
  })
  .catch((error) => {
    console.log("Unable to connect to dfuse endpoint.", error)
  })
```

### Node.js

If you target a `Node.js` environment instead, import a proper `WebSocket` client
implementation.

For now, the library only accepts a `WebSocket` that follows the [WebSocket Web API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
interface. We will provide adapter for the most used packages in the near feature.

For now, the preferred method in `Node.js` is to use the [ws](https://www.npmjs.com/package/ws).
This package is compatible with the [WebSocket Web API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

#### Package [ws](https://www.npmjs.com/package/ws)

Ensure the you added [ws](https://www.npmjs.com/package/ws) as a dependency of your project.
Then, do the following:

```js
const WebSocket = require("ws")

// ... rest as the browser example above
```

#### Package [websocket](https://www.npmjs.com/package/websocket)

The client of this package does **not** follow [WebSocket Web API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) specification. As such, it's
currently not supported by this library.

We might provide an adapter in the future, but nothing is planned yet, pull request welcome!

**Note** It can be used standalone (i.e. without this library), if you really need it, but won't
be able to leverage all the goodies this library provides for you.

### Endpoints

Here the currently available public endpoints:

- **Mainnet** `mainnet.eos.dfuse.io`
- **Kylin** `kylin.eos.dfuse.io`

## Development

The best way to develop this library is through modifying and adding examples
to the project.

To run the examples, it's quite simple, follow these instructions:

1.  Install project dependencies so that you get development tools at the same time:

    ```
    yarn install
    ```

1.  Link the project inside itself, that will be necessary to correct run the
    examples which import `@dfuse/eosws-js`:

    ```
    yarn link
    yarn link @dfuse/eosws-js
    ```

1.  Start the build watcher so distribution files are always up-to-date. Forgetting
    to do that will prevent examples from picking latest changes you've made to
    source files!

    ```
    yarn build:watch
    ```

1.  Last step is to add `.env` file containing the [dfuse](https://dfuse.io) API key
    required to run the examples. Create a file `.env` at the root of the project
    with the following content:

    ```
    DFUSE_IO_API_KEY=Replace this with API key!
    ```

1.  Final check, let's run an example to ensure everything is working:

    ```
    yarn run ts-node examples/get-action-traces.ts
    ```

### Publishing

First, ensure you have a pristine state of your working directory, and check tests & compilation:

    rm -rf dist
    yarn build
    yarn test

Assuming you have been granted access rights to publish this package, the command to perform is simply:

    yarn publish --access public

#### Pre-release

If you want to publish a pre-release version not flagged as the latest so that people still pulls
the current stable version unless they opt-in explicitly, use the following invocation:

    yarn publish --access public --tag next

### Use Cases

You can see various examples in the [examples](./examples) folder. Here the reference list:

- [Get Action Traces](./examples/get-action-traces.ts)
- [Get Action Traces From Multiple Contracts](./examples/get-action-traces-multi-contracts.ts)
- [Get Table Rows](./examples/get-table-rows.ts)
- [Get Table Snapshot Only](./examples/get-table-snapshot-only.ts)
- [Get Transaction Lifecycle](./examples/get-transaction-lifecycle.ts)
- [Multi Listen](./examples/multi-listen.ts)

## API

### Protocol

For the low-level communication protocol, heads down to [dfuse WebSocket API Documentation](https://dfuse.io/en/#websockets-based-api).

### Library

Here the API reference for this actual library.

#### `SocketFactory`

A type representing a function taking no parameters and that must return a `WebSocket` object that will be
used to connect to the remote endpoint.

##### Example

    const socketFactory: SocketFactory = () =>
        new WebSocket(`wss://${endpoint}/v1/stream?token=${token}`, { origin })))

#### `createEoswsSocket`

A factory method responsible of creating a `EoswsSocket` object that is consumed by the `EoswsClient`.

##### Parameters

- `socketFactory` [SocketFactory](#socketfactory) The factory function that will be used to construct the underlying socket.
- `options` [SocketOptions](#socketoptions) The options object to pass to the `EoswsSocket` interface.

#### SocketOptions

##### Properties

- `id` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** An id to identify the actual socket for debugging purposes. (Optional, `undefined` by default)
- `autoReconnect` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** Determine if the socket should auto-reconnect to the remote endpoint when connection is closed abnormally. (Optional, `true` by default).
- `reconnectDelayInMs` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The amount of time in milliseconds to wait before trying a second reconnection attempt.
- `onInvalidMessage` **(message: object) => void** A function that is invoked back when a message of an unknown `type` is returned to the client.
- `onReconnect` **(message: object) => void** A function that is invoked back when a successful reconnection happen.
- `onError` **(message: object) => void** A function that is invoked back when socket receive an `ErrorEvent` according to the WebSocket protocol.
- `onClose` **(message: object) => void** A function that is invoked back when socket receives a `CloseEvent` according to the WebSocket protocol.

#### EoswsClient

A class handling the communication with the remote endpoint dealing with all the details of the `Eosws` protocol.

##### `constructor`

Constructs an `EoswsClient` instance.

###### Parameters

- `EoswsSocket` **EoswsSocket** A `EoswsSocket` instance as returned by [createEoswsClient](#createEoswsClient).

##### `connect`

###### Parameters

None

###### Return

Returns a `Promise<void>` resolving correctly once connected initially on the remote endpoint.

##### `disconnect`

Returns a `Promise<void>` resolving correctly once disconnection has completed with the client.

##### `getActionTraces`

##### Parameters

- `data` **GetActionTracesData** Data Parameters for receiving action traces.
  - `account` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Contract account targeted by the action.
  - `receiver` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** Specify the receiving account executing its smart contract.
    If left blank, defaults to the same value as `account`.
  - `action_name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** Name of the action called within the account contract.
  - `with_ramops` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)?** Stream RAM billing changes and reasons for costs of storage produced by each action.
  - `with_inline_traces` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)?** Stream the inline actions produced by each action.
  - `with_deferred` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)?** Stream the modifications to deferred transactions produced by each action.
- `options` **[StreamOptions](#streamoptions)** Optional common stream options (optional, default `{}`)

##### Return

A [ListenerObject](#listenerobject) on which you can start listening for message related to the stream by calling `listen` on it
and stop listening by calling `unlisten` on it.

##### `getTableRows`

##### Parameters

- `data` **GetTableRows** Data Parameters
  - `code` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Contract account which wrote to tables.
  - `scope` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Table scope where table is stored.
  - `table` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Table name, shown in the contract ABI.
  - `json` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** With json=true (or 1), table rows will be decoded to JSON, using the ABIs active on the queried block. This endpoint will thus automatically adapt to upgrades to the ABIs on chain. (optional, default `true`)
- `options` **[StreamOptions](#streamoptions)** Optional common stream options (optional, default `{}`)

##### Return

A [ListenerObject](#listenerobject) on which you can start listening for message related to the stream by calling `listen` on it
and stop listening by calling `unlisten` on it.

##### `getTransactionLifecycle`

##### Parameters

- `id` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The transaction id to get transaction info.
- `options` **[StreamOptions](#streamoptions)** Optional common stream options (optional, default `{}`)

##### Return

A [ListenerObject](#listenerobject) on which you can start listening for message related to the stream by calling `listen` on it
and stop listening by calling `unlisten` on it.

#### ListenerObject

The object returned when calling one of the main stream handler so that you can then `listen`
and `unlisten` on the stream.

##### Properties

- `listen` **(listener: (message: InboundMessage) => void)** A function that when called, send the starting message to the server and route back all specific stream message for this request back to the `listener` parameter of the project.
- `reqId` **string** The request id used to map back messages from socket to this specific stream.
- `unlisten` **()** A function that when called, stop listening from the stream. The `unlisten` message is sent to the remote endpoint to stop it.

#### StreamOptions

An object containing the various common properties for the Eosws base messaging system.

##### Properties

- `req_id` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** An ID that you want sent back to you for any responses related to this request.
- `start_block` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Block at which you want to start processing.
  It can be an absolute block number, or a negative value, meaning how many blocks from the current head block on the chain.
  Ex: -2500 means 2500 blocks in the past, relative to the head block.
- `listen` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** Whether to listen for new
  events upcoming for this type of stream.
- `fetch` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** Whether to fetch an initial snapshot of the requested entity.
- `with_progress` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** Frequency of the progress of blocks processing (within the scope of a req_id).
  You will, at a maximum, receive one notification each 250 milliseconds (when processing large amounts of blocks),
  and when blockNum % frequency == 0. When you receive a progress notification associated with a stream (again, identified by its req_id),
  you are guaranteed to have seen all messages produced by that stream, between the previous progress notification and the one received (inclusively).

## Credits / Acknowledgement

A big thanks (and hug) to our dear friend [Denis Carriere](https://github.com/DenisCarriere) from
[EOS Nation](https://eosnation.io) for creating the initial version of this project.

## License

MIT
