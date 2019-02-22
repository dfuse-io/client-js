/**
 * Represents a RefreshScheduler.
 * @constructor
 * @param {() => void} scheduledMethod - the method that will be called after a delay in seconds
 */
export class RefreshScheduler {
  public scheduledMethod: () => void
  public renewalTimeout?: any

  constructor(scheduledMethod: () => void) {
    this.scheduledMethod = scheduledMethod
  }

  public scheduleNextRefresh(delay: number) {
    if (this.renewalTimeout) {
      this.clearRefreshTimeout()
    }

    if (delay > 0) {
      this.renewalTimeout = setTimeout(() => {
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
