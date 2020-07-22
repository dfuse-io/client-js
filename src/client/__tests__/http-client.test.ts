import { HttpClient, Fetch, HttpResponse, RequestInit } from "../../types/http-client"
import { createHttpClient } from "../http-client"
import { DfuseApiError, DfuseClientError, DfuseGenericApiError } from "../../types/error"

describe("HttpClient", () => {
  let fetch: jest.Mock<ReturnType<Fetch>, ArgsType<Fetch>>
  let client: HttpClient

  beforeEach(() => {
    fetch = jest.fn<ReturnType<Fetch>, ArgsType<Fetch>>(() => Promise.resolve(okResponse()))
    client = createHttpClient("auth", "api", {
      fetch
    })
  })

  it("correctly sets method on api request", async () => {
    await client.apiRequest("token", "/", "GET", {})
    await client.apiRequest("token", "/", "POST", {})

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(calledFetchHttpRequest(0)).toMatchObject({ method: "GET" })
    expect(calledFetchHttpRequest(1)).toMatchObject({ method: "POST" })
  })

  it("correctly sets method on auth request", async () => {
    await client.authRequest("/", "GET", {})
    await client.authRequest("/", "POST", {})

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(calledFetchHttpRequest(0)).toMatchObject({ method: "GET" })
    expect(calledFetchHttpRequest(1)).toMatchObject({ method: "POST" })
  })

  it("correctly sets body as stringified JSON when no content-type on api request", async () => {
    await client.apiRequest("token", "/", "POST", undefined, { complex: [{ struct: 0 }] })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchHttpRequest()).toMatchObject({ body: '{"complex":[{"struct":0}]}' })
  })

  it("correctly sets body as stringified JSON when content-type application/json on api request", async () => {
    await client.apiRequest(
      "token",
      "/",
      "POST",
      undefined,
      { complex: [{ struct: 0 }] },
      {
        "Content-Type": "application/json"
      }
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchHttpRequest()).toMatchObject({ body: '{"complex":[{"struct":0}]}' })
  })

  it("correctly sets body as stringified form data when content-type application/x-www-form-urlencoded on api request", async () => {
    await client.apiRequest(
      "token",
      "/",
      "POST",
      undefined,
      { complex: "field1", second: "harder" },
      {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchHttpRequest()).toMatchObject({ body: "complex=field1&second=harder" })
  })

  it("correctly sets body as raw string on api request with Content-Type header", async () => {
    await client.apiRequest("token", "/", "POST", undefined, "raw { untransformed as is body }", {
      "Content-Type": "custom/body"
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchHttpRequest()).toMatchObject({ body: "raw { untransformed as is body }" })
  })

  it("correctly sets body as stringified JSON on auth request", async () => {
    await client.authRequest("/", "POST", undefined, { complex: [{ struct: 0 }] })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchHttpRequest()).toMatchObject({ body: '{"complex":[{"struct":0}]}' })
  })

  it("no query params on api request when there is none", async () => {
    await client.apiRequest("token", "/", "GET", {})

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchUrl()).toEqual("api/")
  })

  it("no query params on auth request when there is none", async () => {
    await client.authRequest("/", "GET", {})

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchUrl()).toEqual("auth/")
  })

  it("correctly adds query params on api request when there is a single one", async () => {
    await client.apiRequest("token", "/", "GET", { "specia&name": "special value" })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchUrl()).toEqual("api/?specia%26name=special%20value")
  })

  it("correctly adds query params on auth request when there is a single one", async () => {
    await client.authRequest("/", "GET", { "specia&name": "special value" })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchUrl()).toEqual("auth/?specia%26name=special%20value")
  })

  it("correctly adds query params on api request when there is multiple one", async () => {
    await client.apiRequest("token", "/", "GET", { "specia&name": "special value", more: "value" })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchUrl()).toEqual("api/?specia%26name=special%20value&more=value")
  })

  it("correctly adds query params on auth request when there is multiple one", async () => {
    await client.authRequest("/", "GET", { "specia&name": "special value", more: "value" })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchUrl()).toEqual("auth/?specia%26name=special%20value&more=value")
  })

  it("adds bearer when using on api request with token provided", async () => {
    await client.apiRequest("token", "/", "GET")

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchHttpRequest()).toMatchObject({ headers: { Authorization: "Bearer token" } })
  })

  it("does not add bearer when using on auth request", async () => {
    await client.authRequest("/", "GET")

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchHttpRequest()).toMatchObject({ headers: {} })
  })

  it("adds user headers when using on api request", async () => {
    await client.apiRequest("", "/", "GET", undefined, undefined, { Test: "empty" })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchHttpRequest()).toMatchObject({ headers: { Test: "empty" } })
  })

  it("adds user headers when using on auth request", async () => {
    await client.authRequest("/", "GET", undefined, undefined, { Test: "empty" })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchHttpRequest()).toMatchObject({ headers: { Test: "empty" } })
  })

  it("overrides defaults headers when on api request", async () => {
    await client.apiRequest("token", "/", "GET", undefined, undefined, {
      Authorization: "custom",
      More: "true"
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(calledFetchHttpRequest()).toMatchObject({
      headers: { Authorization: "custom", More: "true" }
    })
  })

  it("returns body as JSON when response succeed", async () => {
    const expectedBody = { complex: [{ struct: 0 }] }
    fetch.mockReturnValue(Promise.resolve(okResponse(expectedBody)))

    const result = await client.apiRequest("token", "/", "GET")
    expect(result).toEqual(expectedBody)
  })

  it("throws DfuseClientError when response succeed but JSON body rejects", async () => {
    fetch.mockReturnValue(
      Promise.resolve(
        rawResponse(
          true,
          {},
          200,
          "OK",
          () => Promise.resolve("not_used"),
          () => Promise.reject("error")
        )
      )
    )

    try {
      await client.apiRequest("token", "/", "GET")
      fail("should have failed")
    } catch (error) {
      expect(error).toBeInstanceOf(DfuseClientError)
      expect(error.message).toEqual("The returned body shall have been a valid JSON object")
      expect(error.cause).toEqual("error")
    }
  })

  it("throws a DfuseApiError when body is valid JSON", async () => {
    const errorData = { code: "test", trace_id: "0", message: "wrong", details: {} }
    fetch.mockReturnValue(Promise.resolve(koResponse(errorData)))

    try {
      await client.apiRequest("token", "/", "GET")
      fail("should have failed")
    } catch (error) {
      expect(error).toBeInstanceOf(DfuseApiError)
      expect(error.code).toEqual(errorData.code)
      expect(error.trace_id).toEqual(errorData.trace_id)
      expect(error.message).toEqual(errorData.message)
      expect(error.details).toEqual(errorData.details)
    }
  })

  it("throws a DfuseApiError when body is valid JSON and has no trace_id nor details", async () => {
    const errorData = { code: "test", message: "wrong" }
    fetch.mockReturnValue(Promise.resolve(koResponse(errorData)))

    try {
      await client.apiRequest("token", "/", "GET")
      fail("should have failed")
    } catch (error) {
      expect(error).toBeInstanceOf(DfuseApiError)
      expect(error.code).toEqual(errorData.code)
      expect(error.trace_id).toBeUndefined()
      expect(error.message).toEqual(errorData.message)
      expect(error.details).toBeUndefined()
    }
  })

  it("throws a DfuseGenericApiError when body is valid JSON but does not fit API format", async () => {
    const errorData = { code: "test", trace_id: "0", message: "wrong", details: {}, other: {} }
    fetch.mockReturnValue(Promise.resolve(koResponse(errorData, { out: "value" }, 502)))

    try {
      await client.apiRequest("token", "/", "GET")
      fail("should have failed")
    } catch (error) {
      expect(error).toBeInstanceOf(DfuseGenericApiError)
      expect(error.code).toEqual(502)
      expect(error.headers).toEqual({ out: "value" })
      expect(error.data).toEqual(errorData)
    }
  })

  it("throws a generic DfuseApiError when error response with invalid JSON body", async () => {
    fetch.mockReturnValue(
      Promise.resolve(
        rawResponse(
          false,
          {},
          500,
          "KO",
          () => Promise.resolve("{"),
          () => Promise.resolve("not_used")
        )
      )
    )

    try {
      await client.apiRequest("token", "/", "GET")
      fail("should have failed")
    } catch (error) {
      expect(error).toBeInstanceOf(DfuseApiError)
      expect(error.code).toEqual("500")
      expect(error.message).toEqual("An unknown HTTP error occurred")
      expect(error.cause).toEqual(new SyntaxError("Unexpected end of JSON input"))
      expect(error.details).toEqual({ body: "{" })
    }
  })

  it("throws a DfuseClientError when error response and text rejects", async () => {
    fetch.mockReturnValue(
      Promise.resolve(
        rawResponse(
          false,
          {},
          500,
          "KO",
          () => Promise.reject("error"),
          () => Promise.resolve("not_used")
        )
      )
    )

    try {
      await client.apiRequest("token", "/", "GET")
      fail("should have failed")
    } catch (error) {
      expect(error).toBeInstanceOf(DfuseClientError)
      expect(error.message).toEqual("Unable to perform HTTP request correctly")
      expect(error.cause).toEqual("error")
    }
  })

  function calledFetchUrl(call?: number): string {
    return fetch.mock.calls[call || 0][0]
  }

  function calledFetchHttpRequest(call?: number): RequestInit | undefined {
    return fetch.mock.calls[call || 0][1]
  }
})

function okResponse(body?: any, headers?: any, status?: number): HttpResponse {
  return response(true, body || {}, headers || {}, status || 200, "OK")
}

function koResponse(body?: any, headers?: any, status?: number): HttpResponse {
  return response(false, body || {}, headers || {}, status || 500, "KO")
}

function response(
  ok: boolean,
  body: any,
  headers: any,
  status: number,
  statusText: string
): HttpResponse {
  return rawResponse(
    ok,
    headers,
    status,
    statusText,
    () => Promise.resolve(JSON.stringify(body)),
    () => Promise.resolve(body)
  )
}

function rawResponse(
  ok: boolean,
  headers: any,
  status: number,
  statusText: string,
  text: () => Promise<string>,
  json: () => Promise<any>
): HttpResponse {
  return {
    ok,
    status,
    statusText,
    headers,
    url: "/",
    json,
    text
  }
}
