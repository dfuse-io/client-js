import { OnStreamRestart } from "./stream-client"

/**
 * A [[Stream]] represents a single open streaming pipeline with dfuse API.
 * On a single WebSocket connection, there is multiple streams active,
 * each it his own request ID. Routing of messages from the WebSocket to
 * the right stream instance is done this way.
 *
 * With this interface, you can control some aspects of the lifecycle of
 * a dfuse Stream. You can `restart` it at a given location when the socket
 * reconnects. You can also `close` the stream once it's not needed anymore.
 *
 * @group Interfaces
 */
export interface Stream {
  /**
   * Represents the request id used to identify this stream across all
   * viable streams.
   *
   * Should be unique among a common pool of Stream.
   */
  readonly id: string

  /**
   * The current [[OnStreamRestart]] callback currently registered
   * by this [[Stream]]. When set to something, it will be invoked after a successful
   * restart of a stream (to be precise, after succesfully sent the `listen` dfuse Stream
   * message on the WebSocket without known if the remote end has actually received
   * yet).
   *
   * There can be only one active `onPostRestart` handler for a given [[Stream]].
   * When set on the [[Stream]] instance.
   */
  onPostRestart?: OnStreamRestart

  /**
   * The current active marker as last marked on this stream. If undefined,
   * it means the marker was never set.
   */
  currentActiveMarker(): undefined | StreamMarker

  /**
   * Restart a stream after it has been disconnect. This re-sends the original
   * registration message along any start marker information (`start_block`
   * argument dfuse Stream API or `cursor` variable for dfuse GraphQL API).
   *
   * If you pass a [[StreamMarker]], the marker is used to determine the
   * the right value to pick.
   *
   * If you do not pass any argument, the last marker set on this stream
   * instance (by calling [[mark]]) will be used if defined.
   *
   * If there is no argument and the stream was never marked for progress,
   * then it sends the original message as-is, and blocks not seen
   * while disconnected will not be re-processed. If it's not valid
   * for your use case, ensure to either `mark` the stream to start
   * back at that point, or use a `marker` when re-connecting.
   *
   * If the stream marker is invalid for the stream client, this will
   * reject the promise with an appropriate error message.
   *
   * @param marker The marker used to decide where to `restart` the
   * stream, see [[StreamMarker]].
   */
  restart(marker?: StreamMarker): Promise<void>

  /**
   * Close the stream. Once closed, the stream is not usable as an object
   * and should be discarded.
   *
   * This closes the socket connection at the same time in the event there
   * is no more stream connected.
   *
   * One can pass the optional `options.error` value to let the stream client
   * managing the stream if this was caused by an error or not. When the `options.error`
   * is set, it will usually be passed to the `join` promise which will be
   * rejected.
   *
   * @param options (optional) Optional parameters
   * @param options.error (defaults `undefined`) The error that caused this stream to be closed, if any.
   */
  close(options?: { error?: Error }): Promise<void>

  /**
   * Join the corresponding stream, waiting for it's completion or for an
   * error to occur. This promise will resolve only when the stream terminates,
   * via any code path.
   *
   * The code path that can terminate a stream:
   * - Someone called the `close` method on the stream.
   * - The stream received a `complete` message indicating the end of the stream.
   * - The stream received a terminating `error` message that forces the stream to stop.
   * - The socket disconnects (whatever the cause, client or server side) and automatic re-connection is not enabled.
   *
   * In the even that disconnection was not abnormal or that the stream was close
   * with the `options.error` being set (i.e. `stream.close({ error: new Error(...) }))`)
   * the the promise will reject with the error being set.
   */
  join(): Promise<void>

  /**
   * Mark the stream at this giving block num. If you mark to tell the
   * library that every block before this one (`atBlockNum` exclusive) were
   * seen and should not be processed anymore.
   *
   * When restarting, if you provide no argument, the stream will restart
   * at this exact marker, giving you blocks that were missed while
   * disconnected.
   *
   * @param marker The marker object to use to mark the stream. Can be either
   * the object `{ cursor: string }` or the object `{ atBlockNum: number }`.
   */
  mark(marker: StreamMarker): void
}

/**
 * Represents a marker of stream which indicates where the stream
 * is currently at in its processing of messages.
 *
 * The marker can be later re-used to restart a [[Stream]] at the right
 * location.
 */
export type StreamMarker = { cursor: string } | { atBlockNum: number }
