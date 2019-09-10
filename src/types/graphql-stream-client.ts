import { Stream } from "./stream"
import { GraphqlDocument, GraphqlVariables } from "./graphql"

/**
 * The stream client is an interface used to interact with dfuse Stream API.
 *
 * The stream client interface shall be responsible of managing the registration
 * unregistration of the dfuse Stream as well as managing the full lifecycle of
 * a dfuse Stream currently active.
 *
 * @group Interfaces
 */
export interface GraphqlStreamClient {
  /**
   * Release any resources hold by this [[GraphqlStreamClient]] instance. Must
   * be tolerant to being called multiple times.
   *
   * Once called, the instance is assumed unsuable and should never
   * be invoked anymore.
   */
  release(): void

  /**
   * Update the API token that should be used to communicate with the dfuse Stream
   * API. This token is assumed to be fresh and valid.
   *
   * @param apiToken The new API token to use from now on.
   */
  setApiToken(apiToken: string): void

  /**
   * Register a dfuse Stream with the remote endpoint and receives message back from
   * the stream via the `onMessage` parameter.
   *
   * By calling this method, the socket will connect to remote endpoint if it's not
   * already the case. As soon as the method is called, the specific dfuse Stream
   * listening message is send to remote endpoint.
   *
   * On success, you will receive a [[Stream]] interface that you can use to
   * interact with the stream (mark progeess, restart, close).
   *
   * On error, the promise will reject with the actual error thrown.
   *
   * @param message The specific [[OutboundMessage]] used to register the stream with the dfuse remote endpoint.
   * @param onMessage The callback that is invoked for each [[InboundMessage]] received bound to this stream.
   */
  registerStream<T = unknown>(
    id: string,
    document: GraphqlDocument,
    variables: GraphqlVariables,
    onMessage: OnGraphqlStreamMessage<T>
  ): Promise<Stream>

  /**
   * Unregister the stream represented by this stream's id.
   *
   * This will send the `unlisten` message to the remote endpoint effectively
   * stopping the dfuse Stream as well as the flow of message.
   *
   * All stream should be unregistered when not required anymore to clean up
   * resources and ensure no more extra bandwidth are required.
   *
   * @param id The stream's id that should be unregister from the stream client.
   */
  unregisterStream(id: string): Promise<void>
}

export type GraphqlStreamMessage<T = unknown> =
  | {
      type: "data"
      data: T
    }
  | {
      type: "error"
      errors: Error[]
    }
  | {
      type: "complete"
    }

export type OnGraphqlStreamMarker = { mark(data: { cursor: string }): void }

export type OnGraphqlStreamMessage<T = unknown> = (
  message: GraphqlStreamMessage<T>,
  marker: OnGraphqlStreamMarker
) => void
export type OnGraphqlStreamRestart = () => void
