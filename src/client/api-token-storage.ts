import { ApiTokenInfo } from "./client"

export interface ApiTokenStorageInterface {
  set: (apiTokenInfo: ApiTokenInfo) => void
  get: () => ApiTokenInfo | undefined
}

export class ApiTokenStorage {
  private apiTokenInfo?: ApiTokenInfo

  public get(): ApiTokenInfo | undefined {
    return this.apiTokenInfo
  }

  public set(apiTokenInfo: ApiTokenInfo) {
    this.apiTokenInfo = apiTokenInfo
  }
}
