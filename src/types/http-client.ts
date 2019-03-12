export const V1_AUTH_ISSUE = "/v1/auth/issue"

export const V0_STATE_ABI = "/v0/state/abi"
export const V0_STATE_ABI_BIN_TO_JSON = "/v0/state/abi/bin_to_json"

export const V0_STATE_KEY_ACCOUNTS = "/v0/state/key_accounts"
export const V0_STATE_PERMISSION_LINKS = "/v0/state/permission_links"

export const V0_STATE_TABLE = "/v0/state/table"
export const V0_STATE_TABLES_SCOPES = "/v0/state/tables/scopes"
export const V0_STATE_TABLES_ACCOUNTS = "/v0/state/tables/accounts"

export const V0_STATE_TABLE_SCOPES = "/v0/state/table_scopes"

export const V0_SEARCH_TRANSACTIONS = "/v0/search/transactions"

/**
 * This interface is the bare minimum as required by our internal usage.
 *
 * Passing the `window.fetch` (in the Browser) or `global.fetch` (polyfilled in Node.js)
 * should always be accepted as a valid usage.
 */
export type Fetch = (url: string, options?: HttpRequest) => Promise<HttpResponse>

export interface HttpQueryParameters {
  [key: string]: any
}

export interface HttpRequest {
  body?: any
  headers?: string[][] | Record<string, string>
  method?: string
}

export interface HttpBody {
  json(): Promise<any>
  text(): Promise<string>
}

export interface HttpResponse extends HttpBody {
  readonly headers: any
  readonly ok: boolean
  readonly status: number
  readonly statusText: string
  readonly url: string
}

export interface HttpClient {
  authRequest<T>(path: string, method: string, params?: HttpQueryParameters, body?: any): Promise<T>

  apiRequest<T>(
    apiToken: string,
    path: string,
    method: string,
    params?: HttpQueryParameters,
    body?: any
  ): Promise<T>
}
