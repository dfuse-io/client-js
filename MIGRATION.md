## Migration Guide

## From `@dfuse/eosws-js` to `@dfuse/client`

The first step is to remove the old library from your package and
install the new version. Examples below are using Yarn, NPM is similar.

    yarn remove @dfuse/eosws-js
    yarn add @dfuse/client

Next step is to rename all imports to the new library. Some renamed
all instances of `@dfuse/eosws-js` to `@dfuse/client`.

After having change the import/require clauses, it's time to change the
client. Indeed, we now have a full fledge dfuse Client and the way
to create it has changed. The `createEoswsSocket` was replaced with
a `createDfuseClient`. The signature of this new call is completely
different than the old one.

In fact, the entire philosophy of the client has changed. We now
deal with an API key instead of an API token. The client will manage
all aspect of the lifecycle of an API token. It will retrieve one
from a store (configurable with sane defaults on Web environment),
ensure it's freshness as well as always ensuring that all underlying
low-level call are always performed using a valid API token.

The old code looks like:

```js
const client = new EoswsClient(
  createEoswsSocket(() => new WebSocket(`wss://${endpoint}/v1/stream?token=${token}`))
)
```

Convert that to the following:

```js
const client = createDfuseClient({
    apiKey: <Paste you API key here>,
    network: "mainnet",                  // Valid values are: `mainnet`, `jungle`, `kylin` or an host name
})
```

**Note** If you were customizing the WebSocket instance, it's still possible but will
need to pass a custom `webSocketFactory` option:

```
const client = createDfuseClient({
  ...,
  streamClientOptions: {
    socketOptions: {
      webSocketFactory: async (url: string) => { new WebSocket(...) },
    }
  }
})
```

If you are in a Node.js environment, you will have to provide
a `fetch` compatible function an a `WebSocket` client. We suggest
the `node-fetch` and `ws` libraries. For a quick configuration path,
simply define the following on the global scope:

```js
global.fetch = require("node-fetch")
global.WebSocket = require("ws")
```

**Note** Don't forget to add those libraries to your package if
you don't already have them.

For more details and alternative configuration options for those
values, look at the [Node.js Section](https://github.com/dfuse-io/client-js#nodejs)
on the documentation.

Once you have the new client, the next step is to convert the actual usage
to the new API.

First, calls to `connect` and `disconnect` should be completely removed. The
client automatically connect/disconnect the stream based if there is active
streams or not.

Then, rename the following client methods:

- `getActionTraces` -> `streamActionTraces`
- `getTableRows` -> `streamTableRows`
- `getTransactionLifecycle` -> `streamTransaction`

Now, calling this method returns a `Stream` object that does not
have an `onMessage` anymore. Instead, the `onMessage` callback
should be moved to the method directly.

So, from this:

```js
const stream = client.getActionTraces(...).onMessage((message) => { ... })
```

You should now have this instead:

```js
const stream = client.streamActionTraces(..., (message) => { ... })
```

The stream now starts as soon as you call the `streamXXX` method. The old
behavior of starting the stream when calling `onMessage` is not supported
anymore.

The `onMessage` will receive the exact same output as before, so you
should not have to do anything.

The options it was possible to pass to the socket when creating it
in the old library must now be passed to the `streamClientOptions.socketOptions`
field when creating the client.

So from this:

```js
const client = new EoswsClient(createEoswsSocket(socketFactory, {
  onInvalidMessage: (...) => { ... },
  onReconnect: (...) => { ... },
  onClose: (...) => { ... },
  onError: (...) => { ... },
}))
```

You should now have this instead:

```js
const client = createDfuseClient({
  ...,
  streamClientOptions: {
    socketOptions: {
      onInvalidMessage: (...) => { ... },
      onReconnect: (...) => { ... },
      onClose: (...) => { ... },
      onError: (...) => { ... },
    }
  }
})
```

On the model part, the `req_id` on `OutboundMessage` type is now a required
field. It must be provided at all time.

There have been small modification to the model to fit with actual dfuse
documentation. Those changes only affect typings and not the actual runtime.

The [dfuse/client-react-example](https://github.com/dfuse-io/client-react-example)
was converted from the old library to the new one. Check [this commit](https://github.com/dfuse-io/client-react-example/commit/46d8df75a3ab03b28f016e429762b75a3249e62f) to see the
changes that was required to pass from `@dfuse/eosws-js` to `@dfuse/client-js`.
