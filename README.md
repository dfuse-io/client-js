# dfuse JavaScript/TypeScript Client Library

A GraphQL, WebSocket and HTTP REST client library to consume dfuse API <https://dfuse.io> ([dfuse docs](https://docs.dfuse.io)).

## Installation

Using Yarn:

    yarn add @dfuse/client

    # Use this command if you are using npm
    #npm install --save @dfuse/client

## Features

What you get by using this library:

- Full dfuse API coverage (GraphQL, REST & WebSocket)
- API Token issuance & management (auto-refresh, expiration handling, storage, etc)
- Automatic re-connection on socket close
- Stream progress management and auto-restart at last marked location on socket re-connection
- Full customization power

## Quick Start

_Notice_ You should replace the sequence of characters `Paste your API key here`
in the script above with your actual API key obtained from https://app.dfuse.io. You are
connecting to a local dfuse for EOSIO instance or to a dfuse Community Edition? Replace
`apiKey: "<Paste your API key here>"` with `authentication: false` so authentication is
disabled.

### EOSIO

<!-- prettier-ignore -->
See [examples/basic/eosio/stream-transfers-graphql.ts](./examples/basic/eosio/stream-transfers-graphql.ts)

```js
const { createDfuseClient } = require("@dfuse/client")
const client = createDfuseClient({
  apiKey: "<Paste your API key here>",
  network: "mainnet.eos.dfuse.io",
})

const streamTransfer = `subscription($cursor: String!) {
  searchTransactionsForward(query: "receiver:eosio.token action:transfer -data.quantity:'0.0001 EOS'", cursor: $cursor) {
    undo cursor
    trace {
      matchingActions { json }
    }
  }
}`

await client.graphql(streamTransfer, (message, stream) => {
  if (message.type === "error") {
    console.log("An error occurred", message.errors, message.terminal)
  }

  if (message.type === "data") {
    const data = message.data.searchTransactionsForward
    const actions = data.trace.matchingActions

    actions.forEach(({ json }: any) => {
      const { from, to, quantity, memo } = json
      console.log(`Transfer [${from} -> ${to}, ${quantity}] (${memo})`)
    })

    stream.mark({ cursor: data.cursor })
  }

  if (message.type === "complete") {
    console.log("Stream completed")
  }
})
```

### Ethereum

See [examples/basic/ethereum/stream-transfers.ts](./examples/basic/ethereum/stream-transfers.ts)

<!-- prettier-ignore -->
```js
const { createDfuseClient } = require("@dfuse/client")

const streamTransfer = `subscription($cursor: String) {
  searchTransactions(query: "method:'transfer(address,uint256)'", cursor: $cursor) {
    undo cursor
    node { hash from to value(encoding: ETHER) }
  }
}`

await client.graphql(streamTransfer, (message, stream) => {
  if (message.type === "error") {
    console.log("An error occurred", message.errors, message.terminal)
  }

  if (message.type === "data") {
    const { cursor, node } = message.data.searchTransactions
    console.log(`Transfer [${node.from} -> ${node.to}, ${node.value}]`)

    stream.mark({ cursor })
  }

  if (message.type === "complete") {
    console.log("Stream completed")
  }
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

Installation instructions using Yarn would be:

    yarn add node-fetch ws

In the bootstrap phase of your application, prior doing any `@dfuse/client` imports/require,
put the following code:

    global.fetch = require("node-fetch");
    global.WebSocket = require("ws");

You can check the [Node.js Configuration](./examples/advanced/common/nodejs-fetch-and-websocket-options.ts)
example for how to avoid polluting the global scope.

### Sane Defaults

The library make sane default assumptions about some of the dependencies
the library requires. This section details the choices we think are the
most important ones.

#### Fetch

The library requires a `Fetch` like interface. In the Browser environment,
this is the `fetch` function that is used (we check that `window.fetch` is
a function).

If `window.fetch` is undefined, we fallback to check `global.fetch` variable.
This can be set in a Node.js environment to point to a compatible implementation
of `fetch`, like the one provided by the [node-fetch](https://npmjs.com/package/node-fetch)
package.

If none is provided, the library throw an error. To avoid this error, you should pass
the `httpClientOptions.fetch` option when creating the dfuse Client.

It possible to provide you own implementation using under the cover any
HTTP library like [axios](https://npmjs.com/package/axios) or even
`XMLHttpRequest` if you wish so.

#### WebSocket

The library requires a `WebSocket` client interface having the same semantics
as the WebSocket API in the Browser environment.

In the Browser environment, this is the standard `WebSocket` variable that is used
(we check that `window.WebSocket` is present).

If `window.WebSocket` is undefined, we fallback to check `global.WebSocket` variable.
This can be set in a Node.js environment to point to a compatible implementation
of `WebSocket` client, like the one provided by the [ws](https://npmjs.com/package/ws)
package.

If none is provided, the library throw an error. To avoid this error, you should pass
the `streamClientOptions.socketOptions.webSocketFactory` and the
`graphqlStreamClientOptions.socketOptions.webSocketFactory` options when creating the dfuse
Client. This factory method receives the full url to connect to the remote endpoint
(this will include the API token to use in query parameters of the url) and should
return a valid `WebSocket` client object.

We highly suggest to use [ws](https://npmjs.com/package/ws) package straight in a
Node.js environment.

#### API Token Store

The API token store interface is used by the dfuse Client to perform the
persistent retrieval and writing of the API token. Indeed, we rate limit
the API token issuance endpoint and as such, it's **highly** important
to re-use a valid token instead of generating a new one each time it's
required to avoid hitting the API token issue rate limiter.

The library, when no `apiTokenStore` options is passed to the client will
pick a default `ApiTokenStore` implementation based on your environment.

In a Browser environment, the concrete implementation that is used is the
[LocalStorageApiTokenStore](https://dfuse-io.github.io/client-js/classes/localstorageapitokenstore.html)
class. This will save and retrieve the token from the browser `localStorage`
(under a `dfuse:token` key).

In a Node.js environment, the concrete implementation that is used is the
[OnDiskApiTokenStore](https://dfuse-io.github.io/client-js/classes/ondiskapitokenstore.html) class.
This will save and retrieve the token from a local file on the disk
at `~/.dfuse/<sha256-api-key>/token.info`.

**Note** Depending on your deployment target (`Docker`, VM, etc.), it's possible
that the home directory (`~`) is not writable, causing the default
[OnDiskApiTokenStore](https://dfuse-io.github.io/client-js/classes/ondiskapitokenstore.html)
instance on Node.js environment to not work correctly. In those cases, simply define
yourself the `apiTokenStore` instance to use and pick the location where the token
should be saved. Instantiate a
[FileApiTokenStore](https://dfuse-io.github.io/client-js/classes/fileapitokenstore.html)
instance and use it as the `apiTokenStore` configuration value when instantiating the
dfuse Client:

```
import { createDfuseClient, FileApiTokenStore } from "@dfuse/client";

const client = createDfuseClient({
  ...,
  apiTokenStore: new FileApiTokenStore("/tmp/dfuse-token.json"),
  ...,
});
```

### API

The full API reference can be found at https://dfuse-io.github.io/client-js/.

This site is generated by running `typedoc` on this repository. The full API
reference being rather exhaustive, here a quick index pointing to the most
important entities' documentation section that should be read to understand
the various part of the library:

##### Factories

- [createDfuseClient](https://dfuse-io.github.io/client-js/globals.html#createdfuseclient)

##### Interfaces

- [DfuseClient](https://dfuse-io.github.io/client-js/interfaces/dfuseclient.html)
- [StreamClient](https://dfuse-io.github.io/client-js/interfaces/streamclient.html)
- [Stream](https://dfuse-io.github.io/client-js/interfaces/stream.html)
- [HttpClient](https://dfuse-io.github.io/client-js/interfaces/httpclient.html)
- [Socket](https://dfuse-io.github.io/client-js/interfaces/socket.html)
- [ApiTokenStore](https://dfuse-io.github.io/client-js/interfaces/apitokenstore.html)

##### Options

- [DfuseClientOptions](https://dfuse-io.github.io/client-js/interfaces/dfuseclientoptions.html)
- [StreamClientOptions](https://dfuse-io.github.io/client-js/interfaces/streamclientoptions.html)
- [HttpClientOptions](https://dfuse-io.github.io/client-js/interfaces/httpclientoptions.html)
- [SocketOptions](https://dfuse-io.github.io/client-js/interfaces/socketoptions.html)

##### Implementations

- [DefaultClient](https://dfuse-io.github.io/client-js/classes/defaultclient.html)
- [LocalStorageApiTokenStore](https://dfuse-io.github.io/client-js/classes/localstorageapitokenstore.html)
- [OnDiskApiTokenStore](https://dfuse-io.github.io/client-js/classes/ondiskapitokenstore.html)
- [FileApiTokenStore](https://dfuse-io.github.io/client-js/classes/fileapitokenstore.html)
- [InMemoryApiTokenStore](https://dfuse-io.github.io/client-js/classes/inmemoryapitokenstore.html)

**Note** `DefaultStreamClient`, `DefaultHttpClient`, `DefaultSocket`, `DefaultApiTokenManager`
are all private implementations not exposed.

### Examples

**Note** You can run the examples straight from this repository quite easily. Clone it to
you computer, run `yarn install && yarn build` in the project directory. Link the local
build so it's usable by the examples:

    yarn link               # Adds a symlink of this project to your global installation
    yarn link @dfuse/client # Adds `@dfuse/client` in this project's `node_modules` folder (global symlink)

Ensures you have an environment variable `DFUSE_API_KEY` set to your dfuse API Key value.
Then simply issue the following command (pick the example file you want to run):

    yarn run:example examples/basic/eosio/stream-transfers-graphql.ts

#### Browser Example

For the browser example to work, you need to edit the `browser.html` file:

- Edit the `browser.html` file to put your own API key, search for `apiKey: "<Paste API key here!>",` in the file.

Once this is done, simply double-click on the `browser.html` file (`open examples/reference/browser.html` on Unix/Mac system).

#### Basic

These are the starter examples showing a concrete use case you can solve using `@dfuse/client`
library. Those toy examples have low to no error handling, check the [Advanced section](#advanced)
for production grade details on efficiently use `@dfuse/client`

##### EOSIO

- [GraphQL Stream Transfers (Query)](./examples/basic/eosio/stream-transfers-graphql.ts)
- [GraphQL Search Your Latest Transactions (Subscription)](./examples/basic/eosio/search-your-latest-transactions-graphql.ts)

- [REST Check Balance (delta between fixed block and now)](./examples/basic/eosio/state-check-balance.ts)
- [REST Search Your Latest Transactions](./examples/basic/eosio/search-your-latest-transactions.ts)
- [WebSocket Stream Transfers](./examples/basic/eosio/stream-transfers-ws.ts)
- [WebSocket Stream Global State](./examples/basic/eosio/stream-global-state-ws.ts)

- [dfuse for EOSIO](./examples/basic/eosio/dfuse-for-eosio.ts)
- [dfuse Community Edition (EOSIO)](./examples/basic/eosio/dfuse-community-edition.ts)

##### Ethereum

- [GraphQL Stream Transfers](./examples/basic/ethereum/stream-transfers.ts)
- [GraphQL Search Your Latest Transactions](./examples/basic/ethereum/search-your-latest-transactions.ts)
- [GraphQL Stream Transactions](./examples/basic/ethereum/stream-transactions.ts)

#### Advanced

You will find examples leveraging the full power library with all the correct patterns to
consume the Blockchain data efficiently, with strict data integrity and how to properly
deal with error and edge cases (like micro-forks!).

##### Common

Those are examples that are general concepts applicable to all chains we support or
about some specifities of the `client-js` library like configuring the WebSocket
connection or the behavior of the client instance itself.

- [Client & Socket Notifications - Looking at all events generated by the library](./examples/advanced/common/client-and-socket-notifications.ts)
- [Forever Stream - Always stay connected to dfuse Stream](./examples/advanced/common/forever-streaming.ts)
- [Multiple Active Streams - Connects multiple dfuse Streams at the same time](./examples/advanced/common/multiple-active-streams.ts)
- [Navigating Forks - Dealing with undo/redo steps](./examples/advanced/common/navigating-forks.ts)
- [GraphQL Never Miss a Beat - Ensuring consistent data integrity](./examples/advanced/common/graphql-never-miss-a-beat.ts)
- [Never Miss a Beat - Ensuring consistent data integrity](./examples/advanced/common/never-miss-a-beat.ts)
- [Node.js HTTP & WebSocket Configuration - Avoid polluting the global scope and customizing WebSocket client](./examples/advanced/common/nodejs-fetch-and-websocket-options.ts)
- [GraphQL - Use 'gql' tag & Typings](./examples/advanced/common/graphql-gql-tag.ts)

##### EOSIO

- [Has Account - Quickest way to have a method to check if an account exists on the chain](./examples/advanced/eosio/has-account.ts)
- [Track RAM Usage - Or how to use the search cursor to fetch next results](./examples/advanced/eosio/track-ram-usage.ts)
- [Stream Irreversible Events Only - Avoiding dealing with micro-forks (non-live)](./examples/advanced/eosio/stream-only-irreversible-events.ts)

#### Reference

In this folder, you will get full reference examples. Those are used to showcase the actual full data
you receive with each call. It's also there where you can check the flow of messages that can be handled
in each dfuse Stream and full configuration options for the library itself and all the API calls.

##### Common

- [auth-issue.ts](./examples/reference/common/auth-issue.ts)
- [api-request.ts](./examples/reference/common/api-request.ts)
- [browser.html (Showcase Browser using UMD build)](./examples/reference/common/browser.html)

##### EOSIO (REST API)

- [fetch-block-id-by-time.ts](./examples/reference/eosio/fetch-block-id-by-time.ts)
- [fetch-transaction.ts](./examples/reference/eosio/fetch-transaction.ts)
- [search-transactions.ts](./examples/reference/eosio/search-transactions.ts)
- [state-abi-bin-to-json.ts](./examples/reference/eosio/state-abi-bin-to-json.ts)
- [state-abi.ts](./examples/reference/eosio/state-abi.ts)
- [state-key-accounts.ts](./examples/reference/eosio/state-key-accounts.ts)
- [state-permission-links.ts](./examples/reference/eosio/state-permission-links.ts)
- [state-table-scopes.ts](./examples/reference/eosio/state-table-scopes.ts)
- [state-table.ts](./examples/reference/eosio/state-table.ts)
- [state-tables-for-accounts.ts](./examples/reference/eosio/state-tables-for-accounts.ts)
- [state-tables-for-scopes.ts](./examples/reference/eosio/state-tables-for-scopes.ts)

##### EOSIO (WebSocket API)

- [stream-action-traces.ts](./examples/reference/eosio/stream-action-traces.ts)
- [stream-head-info.ts](./examples/reference/eosio/stream-head-info.ts)
- [stream-table-rows.ts](./examples/reference/eosio/stream-table-rows.ts)
- [stream-transaction.ts](./examples/reference/eosio/stream-transaction.ts)

##### Ethereum (GraphQL API)

- [stream-pending-transactions.ts](./examples/reference/ethereum/stream-pending-transactions.ts)

## Development

The best way to develop this library is through modifying and adding examples
to the project.

To run the examples, it's quite simple, follow these instructions:

1.  Install project dependencies so that you get development tools at the same time:

    ```
    yarn install
    ```

1.  Link the project inside itself, that will be necessary to correct run the
    examples which import `@dfuse/client`:

    ```
    yarn link
    yarn link @dfuse/client
    ```

1.  Start the build watcher so distribution files are always up-to-date. Forgetting
    to do that will prevent examples from picking latest changes you've made to
    source files!

    ```
    yarn start
    ```

1.  Last step is to add `.env` file containing the [dfuse](https://dfuse.io) API key
    required to run the examples. Create a file `.env` at the root of the project
    with the following content:

    ```
    DFUSE_API_KEY=Replace this with API key!
    ```

1.  Final check, let's run an example to ensure everything is working:

    ```
    yarn run:example examples/basic/eosio/state-check-balance.ts
    ```

### Publishing

First step is to update the change log ([CHANGELOG.md](./CHANGELOG.md)) by updating the
`## In Progress` header to change to `## <Version> (<Month> <Day>, <Year>)` (i.e. `## 0.11.11 (March 26, 2019)`)
and the commit that.

Assuming you have been granted access rights to publish this package, the command to perform is simply:

    yarn run publish:latest

This command will automatically perform a clean build followed by the execution of the full test
suite then a publish the package followed by a publish of the docs and finally push the commits
and tag to the remote repository.

#### Pre-release

If you want to publish a pre-release version not flagged as the latest so that people still pulls
the current stable version unless they opt-in explicitly, use the following invocation:

    yarn run publish:next

Does the same work as `publish:latest` but the docs is not published by this step.

## Credits / Acknowledgement

A big thanks (and hug) to our dear friend [Denis Carriere](https://github.com/DenisCarriere) from
[EOS Nation](https://eosnation.io) for creating the initial version of this project.

## License

MIT
