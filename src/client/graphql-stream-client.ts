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
import { waitFor } from "../helpers/time"

export const DEFAULT_RESTART_ON_ERROR_DELAY_IN_MS = 2500 // 2.5s

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
   * Determines if all streams should automatically restart when the socket disconnects. The stream
   * will re-connect at their latest marked value (See [[Stream.mark]]) if present or at current
   * block if it was never marked.
   *
   * @default `true`
   */
  autoRestartStreamsOnReconnect?: boolean

  /**
   * Determines if all streams should automatically restart when the stream receives an `error`
   * message type from the server. The stream will try to restart automatically at their latest
   * marked value (See [[Stream.mark]]) if present or at current block if it was never marked.
   *
   * @default `true`
   */
  autoRestartStreamsOnError?: boolean

  /**
   * The delay after the the stream receives an error message to wait for before restarting
   * the stream. As no effect if [[GraphqlStreamClientOptions.autoRestartStreamsOnError]] is sets
   * to `false`.
   *
   * @default `2.5s` (See [[DEFAULT_RESTART_ON_ERROR_DELAY_IN_MS]])
   */
  restartOnErrorDelayInMs?: number

  /**
   * When sets to `true`, when no more streams are active, the socket is
   * automatically disconnected and closde. This option should be set to
   * `false` when using `Query` or `Mutation` over WebSocket transport
   * to avoid opening/closing the WebSocket connection for each operation
   * or when multiple short lived `Subscription`s are used.
   *
   * @default `true`
   */
  autoDisconnectSocket?: boolean
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
      : options.autoRestartStreamsOnReconnect,
    options.autoRestartStreamsOnError === undefined ? true : options.autoRestartStreamsOnError,
    options.restartOnErrorDelayInMs === undefined
      ? DEFAULT_RESTART_ON_ERROR_DELAY_IN_MS
      : options.restartOnErrorDelayInMs,
    options.autoDisconnectSocket === undefined ? true : options.autoDisconnectSocket
  )
}

class DefaultGrahqlStreamClient {
  private socket: Socket
  private autoRestartStreamsOnReconnect: boolean
  private autoRestartStreamsOnError: boolean
  private restartOnErrorDelayInMs: number
  private autoDisconnectSocket: boolean
  private debug: IDebugger = debugFactory("dfuse:graphql-stream")

  private apiToken?: string
  private connectionEstablisher: GraphqlConnectionEstablisher
  private streams: { [id: string]: DefaultGraphqlStream<any> } = {}

  constructor(
    socket: Socket,
    autoRestartStreamsOnReconnect: boolean,
    autoRestartStreamsOnError: boolean,
    restartOnErrorDelayInMs: number,
    autoDisconnectSocket: boolean
  ) {
    this.socket = socket
    this.autoRestartStreamsOnReconnect = autoRestartStreamsOnReconnect
    this.autoRestartStreamsOnError = autoRestartStreamsOnError
    this.restartOnErrorDelayInMs = restartOnErrorDelayInMs
    this.autoDisconnectSocket = autoDisconnectSocket

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
      this.debug
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
    const stream = this.streams[id]
    if (stream === undefined) {
      this.debug("Stream [%s] is already unregistered, nothing to do.", id)
      return
    }

    this.debug("Unregistering stream [%s].", id)
    delete this.streams[id]

    try {
      if (stream.isActive && this.socket.isConnected) {
        await this.socket.send({ id, type: "stop" })
      }

      if (Object.keys(this.streams).length <= 0 && this.autoDisconnectSocket) {
        this.debug(
          "No more stream present and auto disconnect sets to true, terminating connection & disconnecting socket."
        )
        if (this.socket.isConnected) {
          await this.socket.disconnect()
        }
      }

      stream.onUnregister()
    } catch (error) {
      stream.onUnregister(error)
      throw error
    }
  }

  private handleMessage = async (rawMessage: unknown) => {
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
        stream.onMessage({ type: "error", errors: message.payload.errors, terminal: false }, stream)
      } else {
        stream.onMessage({ type: "data", data: message.payload.data }, stream)
      }

      // Let's not continue for a data message
      return
    }

    const onStreamCloseError = (error: any) => {
      // FIXME: We shall pass this error somewhere, to some kind of notifier or event
      //        emitter but there is no such stuff right now.
      this.debug(
        "Closing the stream [%s] (in response of GraphQL '%s' message) failed %O.",
        stream.id,
        message.type,
        error
      )
    }

    if (message.type === "error") {
      stream.onMessage({ type: "error", errors: [message.payload], terminal: true }, stream)

      if (this.autoRestartStreamsOnError) {
        this.debug(
          "Stream [%s] received error message and auto restart on error set, waiting [%d ms] before restarting",
          stream.id,
          this.restartOnErrorDelayInMs
        )
        await waitFor(this.restartOnErrorDelayInMs)
        await stream.restart().catch((error) => {
          // Can only happen if the socket does not auto-reconnect and connection lost, in which, stream is screwed anyway
          stream.close({ error }).catch(onStreamCloseError)
        })

        return
      }

      stream.isActive = false
    }

    if (message.type === "complete") {
      stream.onMessage({ type: "complete" }, stream)
      stream.isActive = false
    }

    this.debug("About to close stream [%s] due to GraphQL '%s' message.", stream.id, message.type)
    const closeError = message.type === "error" ? message.payload : undefined

    stream.close({ error: closeError }).catch(onStreamCloseError)
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
        const finalizer = () => {
          // FIXME: We shall pass this error somewhere, to some kind of notifier or event
          //        emitter but there is no such stuff right now.
          this.debug("The re-connection failed to re-establish the GraphQL connection %O", error)
        }

        return Promise.all(Object.keys(this.streams).map((id) => this.streams[id].close()))
          .then(finalizer)
          .catch(finalizer)
      })
  }
}

class DefaultGraphqlStream<T = unknown> implements Stream {
  public readonly id: string
  public onPostRestart?: OnGraphqlStreamRestart

  private active: boolean
  private activeMarker?: StreamMarker
  private activeJoiner?: Deferred<void>
  private closeError?: Error
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
    this.active = false
    this.registrationDocument = registrationDocument
    this.registrationVariables = registrationVariables
    this.onMessageHandler = onMessage
    this.streamExists = streamExists
    this.unregisterStream = unregisterStream
    this.socket = socket
    this.debug = debug
  }

  public get isActive(): boolean {
    return this.active
  }

  public set isActive(value: boolean) {
    this.active = value
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

    return this.socket.send(message).then(() => {
      this.active = true
    })
  }

  public async restart(marker?: StreamMarker): Promise<void> {
    this.debug("About to restart stream [%s]", this.id)
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
        // @ts-ignore The `cursor` field is the only possibility here, it's just TypeScript can't discriminate it
        cursor: activeMarker.cursor
      }
    }

    await this.socket.send(message).then(() => {
      this.active = true
    })

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
        variables: {
          cursor: "",
          ...((resolvedVariables as (Record<string, unknown> | undefined)) || {})
        }
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
    this.closeError = options.error

    return await this.unregisterStream(this.id)
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

  // Public only for the stream client to be able to call us directly. Not best practice but since
  // the client and his streams are tighly coupled, cohesion makes sense here. Will never be seen
  // by a consumer anyway and this method is not part of any backward compatibility policy.
  public onUnregister(unregisterError?: Error) {
    // FIXME: We should probably return a MultiError of some kind to report both of
    //        `unregisterError` and `this.closeError` if they are both set.

    if (unregisterError) {
      this.reject(unregisterError)
    } else if (this.closeError) {
      this.reject(this.closeError)
    } else {
      this.resolve()
    }
  }

  private resolve = () => {
    if (this.activeJoiner) {
      this.debug("Resolving joiner promise for stream [%s].", this.id)
      this.activeJoiner.resolve()
    }
  }

  private reject = (error: Error) => {
    if (this.activeJoiner) {
      this.debug("Rejecting joiner promise for stream [%s] with error %o.", this.id, error)
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
