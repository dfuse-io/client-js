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
 * An interface used to interact with dfuse REST API.
 *
 * Created mainly to abstract implementation details of dealing
 * with HTTP request/response, enable consumer of the library to
 * provide their own implementation of an HTTP client (think about
 * providing `Fetch` interface instead).
 *
 * @group Interfaces
 */
export interface HttpClient {
  /**
   * Make an anonymous request (unauthenticated) to the dfuse Authentication endpoint.
   * Usually used only for issuing an API token from an API key.
   *
   * @param path (required) The HTTP path on the endpoint
   * @param method (required) The HTTP method to perform the request agaisnt
   * @param params (defaults `{}`) The HTTP query parameters to append to the url, they will
   * be url-encoded and included in the final remote url. Has no effect when empty or undefined.
   * @param body (defaults `undefined`) The HTTP body to include in the request, assumed to be a
   * JSON object that will be serialized to a string. Not included in the HTTP request when `undefined`.
   * @param headers (defaults `{}`) The extra HTTP headers to include in the request. Those will be merged
   * with default ones (`{ Authorization: ... }`) and they override them if same key are specified.
   *
   * @returns A `Promise` that will resolve to the response body if it passes. Will reject with a
   * [[DfuseApiError]] if it fits the dfuse Error Format or a generic `DfuseError` is it's something
   * not fitting our expected format.
   */
  authRequest<T>(
    path: string,
    method: string,
    params?: HttpQueryParameters,
    body?: any,
    headers?: HttpHeaders
  ): Promise<T>

  /**
   * Make an authenticated request (unauthenticated) to the dfuse REST endpoint.
   *
   * Upon a succesfull call, the actual response body (expected to be a valid JSON) will
   * be returned to the caller.
   *
   * Upon an error, a [[DfuseError]] is returned, will be a [[DfuseApiError]] if the response's
   * body exist, it's a valid JSON string and it fits the dfuse error format.
   *
   * @param apiToken The API token used to to interact with the API endpoint. The token will be turned
   * into a proper HTTP header `Authorization: Bearer ...`.
   * @param path (required) The HTTP path on the endpoint
   * @param method (required) The HTTP method to perform the request agaisnt
   * @param params (defaults `{}`) The HTTP query parameters to append to the url, they will
   * be url-encoded and included in the final remote url. Has no effect when empty or undefined.
   * @param body (defaults `undefined`) The HTTP body to include in the request, assumed to be a
   * JSON object that will be serialized to a string. Not included in the HTTP request when `undefined`.
   * @param headers (defaults `{}`) The extra HTTP headers to include in the request. Those will be merged
   * with default ones (`{ Authorization: ... }`) and they override them if same key are specified.
   *
   * @returns A `Promise` that will resolve to the response body if it passes. Will reject with a
   * [[DfuseApiError]] if it fits the dfuse Error Format or a generic `DfuseError` is it's something
   * not fitting our expected format.
   */
  apiRequest<T>(
    apiToken: string,
    path: string,
    method: string,
    params?: HttpQueryParameters,
    body?: any,
    headers?: HttpHeaders
  ): Promise<T>
}

export type HttpHeaders = Record<string, string>
export type HttpQueryParameters = Record<string, any>

/**
 * This interface is the bare minimum as required by our internal usage.
 *
 * This is copied to ensure minimal compatiblity with `fetch` is required
 * and thus, it's required to provide a full clone of `fetch` handling.
 * To avoid that problem of over-complexifying , we define a small interface of what we really use
 * inside the library. It's the only part's that are needed.
 *
 * Passing the `window.fetch` (in the Browser) or `global.fetch` (polyfilled in Node.js)
 * should always be accepted as a valid usage.
 *
 * @ignore
 */
export type Fetch = (url: string, options?: RequestInit) => Promise<HttpResponse>

export type RequestInit = {
  body?: any
  headers?: any
  method?: string
}

/**
 * @ignore
 */
export interface HttpBody {
  json(): Promise<any>
  text(): Promise<string>
}

/**
 * @ignore
 */
export type HttpResponse = {
  readonly headers: any
  readonly ok: boolean
  readonly status: number
  readonly statusText: string
  readonly url: string
} & HttpBody
