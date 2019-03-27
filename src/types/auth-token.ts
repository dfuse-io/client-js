export type AuthTokenResponse = ApiTokenInfo

export type ApiTokenInfo = {
  token: string
  expires_at: number
}
