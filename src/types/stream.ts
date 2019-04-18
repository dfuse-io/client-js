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
   * argument of any [[OutboundMessage]]).
   *
   * If you pass a [[StreamMarker]], the marker is used to determine the
   * `start_block` value (`start_block: marker.atBlockNum`).
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
   * @param marker The marker used to decide where to `restart` the stream, see [[StreamMarker]].
   */
  restart(marker?: StreamMarker): Promise<void>

  /**
   * Close the stream. Once closed, the stream is not usable as an object
   * and should be discarded.
   *
   * This closes the socket connection at the same time in the event there
   * is no more stream connected.
   */
  close(): Promise<void>

  /**
   * Mark the stream at this giving block num. If you mark to tell the
   * library that every block before this one (`atBlockNum` exclusive) were
   * seen and should not be processed anymore.
   *
   * When restarting, if you provide no argument, the stream will restart
   * at this exact marker, giving you blocks that were missed while
   * disconnected.
   *
   * @param atBlockNum The block num at which to mark this stream progress.
   */
  mark(options: { atBlockNum: number }): void
}

/**
 * Represents a marker of stream which indicates where the stream
 * is currently at in its processing of messages.
 *
 * The marker can be later re-used to restart a [[Stream]] at the right
 * location.
 */
export type StreamMarker = {
  atBlockNum: number
}
