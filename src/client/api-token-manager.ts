import { RefreshScheduler } from "./refresh-scheduler"
import { ApiTokenStore } from "./api-token-store"
import debugFactory, { IDebugger } from "debug"
import { ApiTokenInfo } from "../types/auth-token"

export const DEFAULT_DELAY_BUFFER_PERCENT = 0.95

export interface ApiTokenManager {
  getTokenInfo: () => Promise<ApiTokenInfo>
}

/**
 * Create the standard [[ApiTokenManager]] interface that will manage all the lifecycle
 * of a token.
 *
 * @param fetchTokenInfo The async function that should be used to retrieve a fresh token.
 * @param onTokenRefresh The function to call when a token has been refreshed.
 * @param delayBuffer The percentage of time to use to schedule the next token refresh
 *                    (i.e. with a value of `0.9` and a token valid for 1000ms from now,
 *                    the next refresh would be scheduled to happen at `now + (0.9 * 1000)`)
 * @param apiTokenStore The API token store interface to retrieve token from and to save it back to.
 * @param refreshScheduler The scheduler interface that should be used to schedule upcoming refresh token
 *                         and check if a scheduled one already exist.
 *
 * @kind Factories
 */
export function createApiTokenManager(
  fetchTokenInfo: () => Promise<ApiTokenInfo>,
  onTokenRefresh: (apiToken: string) => void,
  delayBuffer: number,
  apiTokenStore: ApiTokenStore,
  refreshScheduler: RefreshScheduler
): ApiTokenManager {
  return new DefaultApiTokenManager(
    fetchTokenInfo,
    onTokenRefresh,
    delayBuffer,
    apiTokenStore,
    refreshScheduler
  )
}

/**
 * Check wheter the received [[ApiTokenInfo]] parameter is expired or near its
 * expiration.
 */
export function isApiTokenExpired(tokenInfo: ApiTokenInfo): boolean {
  const now = Date.now() / 1000
  return tokenInfo.expires_at <= now
}

class DefaultApiTokenManager implements ApiTokenManager {
  private fetchTokenInfo: () => Promise<ApiTokenInfo>
  private onTokenRefresh: (apiToken: string) => void
  private delayBuffer: number
  private tokenStore: ApiTokenStore
  private refreshScheduler: RefreshScheduler

  private fetchTokenPromise?: Promise<ApiTokenInfo>
  private debug: IDebugger

  constructor(
    fetchTokenInfo: () => Promise<ApiTokenInfo>,
    onTokenRefresh: (apiToken: string) => void,
    delayBuffer: number,
    tokenStore: ApiTokenStore,
    refreshScheduler: RefreshScheduler
  ) {
    this.fetchTokenInfo = fetchTokenInfo
    this.onTokenRefresh = onTokenRefresh
    this.delayBuffer = delayBuffer
    this.tokenStore = tokenStore
    this.refreshScheduler = refreshScheduler

    this.debug = debugFactory("dfuse:token-manager")
  }

  public async getTokenInfo(): Promise<ApiTokenInfo> {
    const tokenInfo = await this.tokenStore.get()
    if (tokenInfo && !isApiTokenExpired(tokenInfo)) {
      this.maybeScheduleNextRefresh(tokenInfo, { forceRefresh: false })

      this.debug("Returning token found in API token store since it was still valid")
      return Promise.resolve(tokenInfo)
    }

    this.debug("Returning a fresh API token as it was not present in store or expired")
    return await this.refreshToken()
  }

  private async refreshToken(): Promise<ApiTokenInfo> {
    const tokenInfo = await this.internalFetchToken()
    this.debug(
      "Retrieved an API token that is going to expires at %s (%s)",
      new Date(tokenInfo.expires_at * 1000),
      tokenInfo.token
    )

    this.maybeScheduleNextRefresh(tokenInfo, { forceRefresh: true })

    try {
      this.debug("Storing API token into token storage")
      await this.tokenStore.set(tokenInfo)
    } catch (error) {
      this.debug("Storing token into storage failed %s (%o)", error, error)
    }

    this.debug("Notifying upstream listener that API token has been refreshed.")
    this.onTokenRefresh(tokenInfo.token)

    return tokenInfo
  }

  private maybeScheduleNextRefresh(tokenInfo: ApiTokenInfo, options: { forceRefresh: boolean }) {
    if (!options.forceRefresh && this.refreshScheduler.hasScheduledJob()) {
      return
    }

    const delayInSeconds = this.getRefreshDelayInSeconds(tokenInfo)
    const refreshAt = new Date(Date.now() + delayInSeconds * 1000)

    this.debug(
      "Scheduling next token refresh to occur at %s (in %s seconds)",
      refreshAt,
      delayInSeconds
    )

    this.refreshScheduler.schedule(delayInSeconds, () => this.refreshToken())
  }

  private getRefreshDelayInSeconds(tokenInfo: ApiTokenInfo) {
    const nowInSeconds = Math.floor(Date.now() / 1000)

    return (tokenInfo.expires_at - nowInSeconds) * this.delayBuffer
  }

  private async internalFetchToken(): Promise<ApiTokenInfo> {
    if (this.fetchTokenPromise !== undefined) {
      return this.fetchTokenPromise
    }

    this.fetchTokenPromise = new Promise<ApiTokenInfo>((resolve, reject) => {
      this.fetchTokenInfo()
        .then((apiTokenInfo: ApiTokenInfo) => {
          this.fetchTokenPromise = undefined
          resolve(apiTokenInfo)
        })
        .catch((error: any) => {
          this.fetchTokenPromise = undefined
          reject(error)
        })
    })

    return this.fetchTokenPromise
  }
}
