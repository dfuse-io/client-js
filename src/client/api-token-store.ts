import { ApiTokenInfo } from "../types/auth-token"

/**
 * A simple API token store interface supporting async operations. This
 * interface is used to store the API token when it has been refreshed
 * as well as retrieving a token from the store.
 *
 * By providing your own [[ApiTokenStore]] implementation, you can for
 * example easily store the token in the `localStorage` of the Browser
 * if your targeting this environment by rolling your own version:
 *
 * ```typescript
 * class LocalStorageApiTokenStore implements ApiTokenStore {
 *   async set(apiTokenInfo: ApiTokenInfo): Promise<void> {
 *     localStorage.set('dfuse-token', JSON.stringify(apiTokenInfo))
 *   }
 *
 *   async get(apiTokenInfo: ApiTokenInfo): Promise<ApiTokenInfo | undefined> {
 *     const tokenData = localStorage.get('dfuse-token')
 *     if (tokenData === null) {
 *       return undefined
 *     }
 *
 *     return JSON.parse(tokenData)
 *   }
 * }
 * ```
 *
 * @kind Interfaces
 */
export interface ApiTokenStore {
  set: (apiTokenInfo: ApiTokenInfo) => Promise<void>
  get: () => Promise<ApiTokenInfo | undefined>
}

/**
 * Represents an in-memory token storage concrete implementation of
 * a [[ApiTokenStore]]. This simply keep the token in variable and serves
 * it from there.
 *
 * It is **never** persisted and will be reset upon restart of the Browser tab
 * or process, leading to a new token being issued.
 *
 * You should try hard to use a persistent solution so that you re-use the
 * same token as long as it's valid.
 */
export class InMemoryApiTokenStore {
  private apiTokenInfo?: ApiTokenInfo

  public async get(): Promise<ApiTokenInfo | undefined> {
    return this.apiTokenInfo
  }

  public async set(apiTokenInfo: ApiTokenInfo): Promise<void> {
    this.apiTokenInfo = apiTokenInfo
  }
}
