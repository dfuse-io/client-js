import { ApiTokenInfo } from "../types/auth-token"

export interface ApiTokenStore {
  set: (apiTokenInfo: ApiTokenInfo) => Promise<void>
  get: () => Promise<ApiTokenInfo | undefined>
}

export class InMemoryApiTokenStore {
  private apiTokenInfo?: ApiTokenInfo

  public async get(): Promise<ApiTokenInfo | undefined> {
    return this.apiTokenInfo
  }

  public async set(apiTokenInfo: ApiTokenInfo): Promise<void> {
    this.apiTokenInfo = apiTokenInfo
  }
}
