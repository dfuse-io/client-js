# dfuse JavaScript/TypeScript Client Library

A WebSocket and HTTP REST client library to consume dfuse API <https://dfuse.io> on EOS networks.

**Note** This library is the newest hottest version of [@dfuse/eosws-js](https://github.com/dfuse-io/eosws-js)
library. If you land here because your are using it, refer to the [MIGRATION.md](./MIGRATION.md) file for how
to upgrade.

## Installation

Using Yarn:

    yarn add @dfuse/client

    # Use this command if you are using npm
    #npm install --save @dfuse/client

## Quick Start

When targeting a browser (you will need a bundler like WebPack since we only ship ES5 modules files for now):

<!-- prettier-ignore -->
```js
const { createDfuseClient, InboundMessageType } = require("@dfuse/client")

const client = createDfuseClient({ apiKey: "<Your dfuse API key here>", network: "mainnet" })

client.streamActionTraces({ accounts: "eosio.token", action_names: "transfer" }, (message) => {
  if (message.type === InboundMessageType.ACTION_TRACE) {
    const { from, to, quantity, memo } = message.data.trace.act.data
    console.log(`Transfer [${from} -> ${to}, ${quantity}] (${memo})`)
  }
}).catch((error) => {
  console.log("An error occurred.", error)
})
```

### Node.js

If you target a `Node.js` environment instead, you will need bring a `fetch` compatible
function and a proper `WebSocket` client.

You are free to use any compatible library respecting the respective requirements. To
make it simple, if `fetch` and/or `WebSocket` are available in the global scope (`global`),
they are picked automatically by the library. While polluting the global scope, it's the
easiest way to get started.

It's what the examples in this project do using respectively
[node-fetch](https://www.npmjs.com/package/node-fetch) and
and [ws](https://www.npmjs.com/package/ws) for `fetch` and `WebSocket` respectively.

In the bootstrap phase of your application, prior doing any `@dfuse/client` imports/require,
put the following code:

    global.fetch = require("node-fetch");
    global.WebSocket = require("ws");

You can check the [Node.js Configuration](./examples/advanced/nodejs-fetch-and-websocket-options.ts)
example for how to avoid polluting the global scope.

### API

The full API reference can be found at https://dfuse-io.github.io/client-js/.

This site is generated by running `typedoc` on this repository.

### Examples

**Note** You can run the examples straight from this repository quite easily. Clone it to
you computer, run `yarn install && yarn build` in the project directory. Link the local
build so it's usable by the examples:

    yarn link               # Adds a symlink of this project to your global installation
    yarn link @dfuse/client # Adds `@dfuse/client` in this project's `node_modules` folder (global symlink)

Ensures you have an environment variable `DFUSE_API_KEY` set to your dfuse API Key value.
Then simply issue the following command (pick the example file you want to run):

    yarn run:example examples/basic/stream-transfers.ts

#### Basic

These are the starter examples showing a concrete use case you can solve using `@dfuse/client`
library. Those toy examples have low to no error handling, check the [Advanced section](#advanced)
for production grade details on efficiently use `@dfuse/client`

- [Check Balance (delta between fixed block and now)](./examples/basic/check-balance.ts)
- [Search Your Latest Transactions](./examples/basic/search-your-latest-transactions.ts)
- [Stream Transfers](./examples/basic/stream-transfers.ts)
- [Stream Global State](./examples/basic/stream-global-state.ts)

#### Advanced

You will find examples leveraging the full power library with all the correct patterns to
consume the Blockchain data efficiently, with strict data integrity and how to properly
deal with error and edge cases (like micro-forks!).

- [Client & Socket Notifications - Looking at all events generated by the library](./examples/advanced/client-and-socket-notifications.ts)
- [Forever Stream - Always stay connected to dfuse Stream](./examples/advanced/forever-streaming.ts)
- [Multiple Active Streams - Connects multiple dfuse Streams at the same time](.examples/advanced/multiple-active-streams.ts)
- [Navigating Forks - Dealing with undo/redo steps](./examples/advanced/navigating-forks.ts)
- [Never Miss a Beat - Ensuring consistent data integrity](./examples/advanced/never-miss-a-beat.ts)
- [Node.js HTTP & WebSocket Configuration - Avoid polluting the global scope and customizing WebSocket client](./examples/advanced/nodejs-fetch-and-websocket-options.ts)
- [Stream Irreversible Events Only - Avoiding dealing with micro-forks (non-live)](./examples/advanced/stream-only-irreversible-events.ts)
- [Track RAM Usage - Or how to use the search cursor to fetch next results](./examples/advanced/track-ram-usage.ts)

#### Reference

In this folder, you will get full reference examples. Those are used to showcase the actual full data
you receive with each call. It's also there where you can check the flow of messages that can be handled
in each dfuse Stream and full configuration options for the library itself and all the API calls.

- HTTP

  - [auth-issue.ts](./examples/reference/auth-issue.ts)
  - [search-transactions.ts](./examples/reference/search-transactions.ts)
  - [state-abi-bin-to-json.ts](./examples/reference/state-abi-bin-to-json.ts)
  - [state-abi.ts](./examples/reference/state-abi.ts)
  - [state-key-accounts.ts](./examples/reference/state-key-accounts.ts)
  - [state-permission-links.ts](./examples/reference/state-permission-links.ts)
  - [state-table-scopes.ts](./examples/reference/state-table-scopes.ts)
  - [state-table.ts](./examples/reference/state-table.ts)
  - [state-tables-for-accounts.ts](./examples/reference/state-tables-for-accounts.ts)
  - [state-tables-for-scopes.ts](./examples/reference/state-tables-for-scopes.ts)

- Stream

  - [stream-action-traces.ts](./examples/reference/stream-action-traces.ts)
  - [stream-head-info.ts](./examples/reference/stream-head-info.ts)
  - [stream-table-rows.ts](./examples/reference/stream-table-rows.ts)
  - [stream-transaction.ts](./examples/reference/stream-transaction.ts)

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

    yarn clean
    yarn build
    yarn test

Assuming you have been granted access rights to publish this package, the command to perform is simply:

    yarn publish --access public

#### Pre-release

If you want to publish a pre-release version not flagged as the latest so that people still pulls
the current stable version unless they opt-in explicitly, use the following invocation:

    yarn publish --access public --tag next

## Credits / Acknowledgement

A big thanks (and hug) to our dear friend [Denis Carriere](https://github.com/DenisCarriere) from
[EOS Nation](https://eosnation.io) for creating the initial version of this project.

## License

MIT
