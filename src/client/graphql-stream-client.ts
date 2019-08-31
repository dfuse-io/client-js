import debugFactory, { IDebugger } from "debug"
import { SocketOptions, createSocket } from "./socket"
import { Deferred } from "../helpers/promises"
import { DfuseClientError } from "../types/error"
import { Socket } from "../types/socket"
import { Stream, StreamMarker } from "../types/stream"
import {
  GraphqlStreamClient,
  OnGraphqlStreamMessage,
  OnGraphqlStreamRestart
} from "../types/graphql-stream-client"
import {
  GraphqlDocument,
  GraphqlVariables,
  GraphqlInboundMessage,
  GraphqlStartOutboundMessage
} from "../types/graphql"

/**
 * The set of options that can be used when constructing a the default
 * [[StreamClient]] instance through the [[createStreamClient]] factory
 * method.
 */
export interface GraphqlStreamClientOptions {
  /**
   * The [[Socket]] instance to use, inferred based on the environment when not provided.
   *
   * @default `undefined` (Inferred based on runtime environment (Node.js/Browser), see [[createSocket]])
   */
  socket?: Socket

  /**
   * The [[SocketOptions]] to pass when creating the default [[Socket]] instance.
   * This field has no effect if you provide yourself a [[StreamClientOptions.socket]] option.
   *
   * @default `undefined` (See [[SocketOptions]] for actual defaults this generates)
   */
  socketOptions?: SocketOptions

  /**
   * Determines all streams should automatically restart when the socket disconnects. The stream
   * will re-connect at their latest marked value (See [[Stream.mark]]) if present or at current
   * block if it was never marked.
   *
   * @default `true`
   */
  autoRestartStreamsOnReconnect?: boolean
}

/**
 * Create the default [[StreamClient]] concrete implementation.
 *
 * @param wsUrl The url used to reach the dfuse Stream API, should **not** contain the `token` query parameter. Passed as
 * is to created [[Socket]] interface through the [[createSocket]] factory method. This parameter has no effect
 * if [[StreamClientOptions.socket]] options is used.
 * @param options The set of options used to construct the default [[StreamClient]] instance. See
 * [[StreamClientOptions]] for documentation of the options and default values for each of them.
 */
export function createGraphqlStreamClient(
  wsUrl: string,
  options: GraphqlStreamClientOptions = {}
): GraphqlStreamClient {
  return new DefaultGrahqlStreamClient(
    options.socket ||
      createSocket(wsUrl, {
        id: "graphql",
        webSocketProtocols: "graphql-ws",
        ...options.socketOptions
      }),
    options.autoRestartStreamsOnReconnect === undefined
      ? true
      : options.autoRestartStreamsOnReconnect
  )
}

class DefaultGrahqlStreamClient {
  private socket: Socket
  private autoRestartStreamsOnReconnect: boolean
  private debug: IDebugger = debugFactory("dfuse:graphql-stream")

  private apiToken?: string
  private connectionEstablisher: GraphqlConnectionEstablisher
  private streams: { [id: string]: DefaultGraphqlStream<any> } = {}

  constructor(socket: Socket, autoRestartStreamsOnReconnect: boolean) {
    this.socket = socket
    this.autoRestartStreamsOnReconnect = autoRestartStreamsOnReconnect

    this.connectionEstablisher = new GraphqlConnectionEstablisher(this.debug)
  }

  public release(): void {
    this.debug("Terminating connection & releasing default GraphQL stream client")

    this.socket.disconnect().catch((error) => {
      this.debug(
        "An error occurred while disconnecting from socket while releasing instance",
        error
      )
    })
  }

  public setApiToken(apiToken: string) {
    this.apiToken = apiToken
  }

  public async registerStream<T = unknown>(
    id: string,
    document: GraphqlDocument,
    variables: GraphqlVariables,
    onMessage: OnGraphqlStreamMessage<T>
  ): Promise<Stream> {
    if (!this.socket.isConnected) {
      this.debug("Socket is not connected, connecting socket first.")
      await this.socket.connect(this.handleMessage, { onReconnect: this.handleReconnection })
      await this.connectionEstablisher.establish(this.apiToken!, this.socket)
    }

    if (this.streams[id] !== undefined) {
      throw new DfuseClientError(
        `A stream with id '${id}' is already registered, cannot register another one with the same id`
      )
    }

    this.debug("Registering stream [%s]", id)
    const streamExists = (streamId: string) => this.streams[streamId] !== undefined
    const unregisterStream = (streamId: string) => this.unregisterStream(streamId)
    const stream = new DefaultGraphqlStream(
      id,
      document,
      variables,
      onMessage,
      streamExists,
      unregisterStream,
      this.socket,
      this.debug.extend(id, ":")
    )

    // Let's first register stream to ensure that if messages arrives before we got back
    // execution flow after `send` call, the listener is already present to handle message
    this.streams[id] = stream

    try {
      await stream.start()
    } catch (error) {
      delete this.streams[id]
      throw new DfuseClientError(`Unable to correctly register stream '${id}'`, error)
    }

    this.debug("Stream [%s] registered with remote endpoint.", id)
    return stream
  }

  public async unregisterStream(id: string): Promise<void> {
    if (this.streams[id] === undefined) {
      this.debug("Stream [%s] is already unregistered, nothing to do.", id)
      return
    }

    this.debug("Unregistering stream [%s].", id)

    delete this.streams[id]

    if (this.socket.isConnected) {
      // FIXME: We should not send a stop message in the event the stream has already received `error` or `complete` message
      await this.socket.send({ id, type: "stop" })
    }

    if (Object.keys(this.streams).length <= 0) {
      this.debug("No more stream present, terminating connection & disconnecting socket.")
      if (this.socket.isConnected) {
        await this.socket.disconnect()
      }
    }
  }

  private handleMessage = (rawMessage: unknown) => {
    const message = rawMessage as GraphqlInboundMessage
    if (message.type === "ka") {
      this.debug("Discarding 'ka' (Keep Alive) message from reaching the underlying stream(s).")
      return
    }

    if (message.type === "connection_ack" || message.type === "connection_error") {
      this.connectionEstablisher.onMessage(message)
      return
    }

    this.debug(
      "Routing socket message of type '%s' with id '%s' to appropriate stream",
      message.type,
      message.id
    )
    const stream = this.streams[message.id || ""]
    if (stream === undefined) {
      this.debug("No stream currently registered able to handle message with 'id: %s'", message.id)
      return
    }

    if (message.type === "data") {
      if (message.payload.errors) {
        stream.onMessage({ type: "error", errors: message.payload.errors })
      } else {
        stream.onMessage({ type: "data", data: message.payload.data })
      }

      // FIXME: Does a "data" message with an `errors` field will later receive the `error` msg
      //        or should we close in this case also right away?
      // Let's not continue for a data message
      return
    }

    if (message.type === "error") {
      stream.onMessage({ type: "error", errors: [message.payload] })
    }

    if (message.type === "complete") {
      stream.onMessage({ type: "complete" })
    }

    this.debug("About to close stream due to GraphQL '%s' message.", message.type)
    let closeError: Error | undefined
    if (message.type === "error") {
      closeError = message.payload
    }

    stream.close({ error: closeError }).catch((error) => {
      // FIXME: We shall pass this error somewhere, to some kind of notifier or event
      //        emitter but there is no such stuff right now.
      this.debug(
        "Closing the stream (in response of GraphQL '%s' message) failed %O.",
        message.type,
        error
      )
    })
  }

  private handleReconnection = () => {
    this.debug("Handling re-connection notification from socket.")
    if (this.autoRestartStreamsOnReconnect === false) {
      return
    }

    this.connectionEstablisher
      .establish(this.apiToken!, this.socket)
      .then(() => {
        return Promise.all(Object.keys(this.streams).map((id) => this.streams[id].restart()))
      })
      .catch((error) => {
        return Promise.all(Object.keys(this.streams).map((id) => this.streams[id].close())).finally(
          () => {
            // FIXME: We shall pass this error somewhere, to some kind of notifier or event
            //        emitter but there is no such stuff right now.
            this.debug("The re-connection failed to re-establish the GraphQL connection %O", error)
          }
        )
      })
  }
}

class DefaultGraphqlStream<T = unknown> implements Stream {
  public readonly id: string
  public onPostRestart?: OnGraphqlStreamRestart

  private activeMarker?: StreamMarker
  private activeJoiner?: Deferred<void>
  private registrationDocument: GraphqlDocument
  private registrationVariables: GraphqlVariables | (() => GraphqlVariables) | undefined
  private onMessageHandler: OnGraphqlStreamMessage<T>
  private unregisterStream: (id: string) => Promise<void>
  private streamExists: (id: string) => boolean
  private socket: Socket
  private debug: IDebugger

  constructor(
    id: string,
    registrationDocument: GraphqlDocument,
    registrationVariables: GraphqlVariables,
    onMessage: OnGraphqlStreamMessage<T>,
    streamExists: (id: string) => boolean,
    unregisterStream: (id: string) => Promise<void>,
    socket: Socket,
    debug: IDebugger
  ) {
    this.id = id
    this.registrationDocument = registrationDocument
    this.registrationVariables = registrationVariables
    this.onMessageHandler = onMessage
    this.streamExists = streamExists
    this.unregisterStream = unregisterStream
    this.socket = socket
    this.debug = debug
  }

  public get onMessage(): OnGraphqlStreamMessage<T> {
    return this.onMessageHandler
  }

  public currentActiveMarker(): undefined | StreamMarker {
    return this.activeMarker
  }

  public async start(): Promise<void> {
    const message = await this.createStartMessage()
    if (message.payload!.variables !== undefined) {
      message.payload!.variables = {
        cursor: "",
        ...message.payload!.variables
      }
    }

    return this.socket.send(message)
  }

  public async restart(marker?: StreamMarker): Promise<void> {
    this.checkMarker(marker)

    if (!this.streamExists(this.id)) {
      throw new DfuseClientError(
        `Trying to restart a stream '${
          this.id
        }' that is not registered anymore or was never registered`
      )
    }

    let activeMarker = this.activeMarker
    if (marker) {
      activeMarker = marker
    }

    const message = await this.createStartMessage()
    if (activeMarker) {
      message.payload.variables = {
        ...(message.payload.variables || {}),
        // @ts-ignore The `cursor` field is the only possibility here, it's just TypeScript can discriminate it
        cursor: activeMarker.cursor
      }
    }

    await this.socket.send(message)

    if (this.onPostRestart) {
      this.onPostRestart()
    }
  }

  private async createStartMessage(): Promise<GraphqlStartOutboundMessage> {
    let resolvedVariables = this.registrationVariables
    if (typeof resolvedVariables === "function") {
      // We use `as any` here because the docs builder which uses TypeScript 3.2.4 chokes on this line due to hard typing.
      // At some point, the `typedoc` will be updated and the error should resolves itself. Simply remove the cast and
      // regenerate the docs `yarn build:docs` to test if it's fixed or not.
      resolvedVariables = await (resolvedVariables as any)()
    }

    return {
      id: this.id,
      type: "start",
      payload: {
        query: this.registrationDocument,
        variables: resolvedVariables as (Record<string, unknown> | undefined)
      }
    }
  }

  public async join(): Promise<void> {
    if (this.activeJoiner !== undefined) {
      return this.activeJoiner.promise()
    }

    this.activeJoiner = new Deferred()

    return this.activeJoiner.promise()
  }

  public mark(marker: StreamMarker) {
    this.activeMarker = this.checkMarker(marker)
  }

  public async close(options: { error?: Error } = {}): Promise<void> {
    return (
      this.unregisterStream(this.id)
        .then(() => {
          if (options.error) {
            this.reject(options.error)
          } else {
            this.resolve()
          }
        })
        // FIXME: We should probably return a MultiError of some kind to report both error if `options.error` exists
        .catch((error) => {
          this.reject(error)
        })
    )
  }

  private checkMarker(marker?: StreamMarker): StreamMarker | undefined {
    if (!marker) {
      return undefined
    }

    if (!(marker as any).cursor) {
      throw new DfuseClientError("Only non-empty `cursor` markers are accepted for this operation")
    }

    return marker
  }

  private resolve = () => {
    if (this.activeJoiner) {
      this.debug("Resolving joiner promise.")
      this.activeJoiner.resolve()
    }
  }

  private reject = (error: Error) => {
    if (this.activeJoiner) {
      this.debug("Rejecting joiner promise with error %o.", error)
      this.activeJoiner.reject(error)
    }
  }
}

class GraphqlConnectionEstablisher {
  private debug: IDebugger

  private activeSocket?: Socket
  private activeDeferred?: Deferred<void>

  constructor(debug: IDebugger) {
    this.debug = debug
  }

  public async establish(apiToken: string, socket: Socket): Promise<void> {
    if (this.activeDeferred !== undefined) {
      return this.activeDeferred.promise()
    }

    this.activeDeferred = new Deferred<void>()
    this.activeSocket = socket

    this.debug("Initiating graphql stream connection")
    socket.send({
      type: "connection_init",
      payload: {
        Authorization: apiToken
      }
    })

    return this.activeDeferred.promise()
  }

  public onMessage(message: GraphqlInboundMessage) {
    if (this.activeDeferred === undefined) {
      return
    }

    if (message.type === "connection_ack") {
      this.debug("Received connection_ack message, resolving active promise")
      this.resolve()
      return
    }

    if (message.type === "connection_error") {
      this.debug("Received connection_error message, rejecting active promise")
      this.reject(message.payload! as Error)
      return
    }

    this.debug(
      "Received an unknown message while waiting for graphql connection to establish, something is fishy %O",
      message
    )
  }

  private resolve() {
    if (this.activeDeferred === undefined) {
      return
    }

    this.debug("Resolving connection establisher deferred promise.")
    this.activeDeferred.resolve()
    this.activeDeferred = undefined
  }

  private reject(error: Error) {
    const complete = () => {
      if (this.activeDeferred !== undefined) {
        this.debug("Rejecting connection establisher deferred promise.")
        this.activeDeferred.reject(error)
        this.activeDeferred = undefined
      }
    }

    if (this.activeSocket && this.activeSocket.isConnected) {
      this.activeSocket
        .disconnect()
        .then(complete)
        .catch(complete)
    } else {
      complete()
    }
  }
}
