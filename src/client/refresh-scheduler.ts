import { IDebugger } from "debug"
import debugFactory from "debug"

/**
 * Represents a RefreshScheduler.
 * @constructor
 * @param {() => void} scheduledMethod - the method that will be called after a delay in seconds
 */
export class RefreshScheduler {
  public scheduledMethod: () => void
  public renewalTimeout?: any
  private debug: IDebugger

  constructor(scheduledMethod: () => void) {
    this.scheduledMethod = scheduledMethod
    this.debug = debugFactory("eosws:refresh-scheduler")
  }

  public scheduleNextRefresh(delay: number) {
    if (this.renewalTimeout) {
      this.clearRefreshTimeout()
    }

    if (delay > 0) {
      this.renewalTimeout = setTimeout(() => {
        this.debug("calling scheduled method")
        this.debug("%O", this.scheduledMethod)
        this.scheduledMethod()
        this.clearRefreshTimeout()
      }, delay)
    }
  }

  private clearRefreshTimeout() {
    clearTimeout(this.renewalTimeout)
    this.renewalTimeout = undefined
  }
}
