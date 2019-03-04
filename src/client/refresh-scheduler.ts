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

  public scheduleNextRefresh(delayInS: number) {
    if (this.renewalTimeout) {
      this.clearRefreshTimeout()
    }

    if (delayInS > 0) {
      this.renewalTimeout = setTimeout(() => {
        this.debug("calling scheduled method")
        this.debug("%O", this.scheduledMethod)
        this.scheduledMethod()
        this.clearRefreshTimeout()
      }, delayInS * 1000)
    }
  }

  private clearRefreshTimeout() {
    clearTimeout(this.renewalTimeout)
    this.renewalTimeout = undefined
  }
}
