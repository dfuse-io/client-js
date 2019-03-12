export type AuthTokenResponse = ApiTokenInfo

export interface ApiTokenInfo {
  token: string
  expires_at: number
}
