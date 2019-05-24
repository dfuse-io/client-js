import { IDebugger } from "debug"
import debugFactory from "debug"

export type ScheduleJob = () => void

export interface RefreshScheduler {
  release(): void
  hasScheduledJob(): boolean
  schedule(delayInSeconds: number, job: ScheduleJob): void
}

export function createRefreshScheduler(): RefreshScheduler {
  return new DefaultRefreshScheduler()
}

class DefaultRefreshScheduler {
  public renewalTimeout?: any
  private debug: IDebugger

  constructor() {
    this.debug = debugFactory("dfuse:refresh-scheduler")
  }

  public release(): void {
    this.debug("Releasing default refresh scheduler")
    if (this.renewalTimeout !== undefined) {
      this.debug("Clearing refresh timeout interval")
      this.clearRefreshTimeout()
    }
  }

  public hasScheduledJob(): boolean {
    return this.renewalTimeout !== undefined
  }

  public schedule(delayInSeconds: number, job: ScheduleJob, onJobFailed?: (error: any) => void) {
    if (delayInSeconds <= 0) {
      this.debug("Delay in seconds should be greater than 0")
      return
    }

    if (this.renewalTimeout) {
      this.debug("Clearing previous sheduled timer")
      this.clearRefreshTimeout()
    }

    this.renewalTimeout = setTimeout(() => {
      try {
        this.debug("Executing scheduled job at %s%O", new Date(), job)
        job()
      } catch (error) {
        this.debug("Scheduled job failed (%o)", error)
        if (onJobFailed) {
          onJobFailed(error)
        }
      }

      this.clearRefreshTimeout()
    }, delayInSeconds * 1000)
  }

  private clearRefreshTimeout() {
    clearTimeout(this.renewalTimeout)
    this.renewalTimeout = undefined
  }
}
