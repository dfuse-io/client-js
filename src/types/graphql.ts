export type GraphqlOperationType = "query" | "mutation" | "subscription"

// See https://github.com/graphql/graphql-js/blob/master/src/language/ast.js#L1 for actual object like Document
//
// **Note** We are a bit more broad to avoid important all types yet, since it's not really required
export type GraphqlDocument =
  | string
  | {
      kind: "Document"
      loc?: Record<string, unknown>
      definitions: ReadonlyArray<unknown>
    }

export type GraphqlInboundMessageType =
  | "connection_ack"
  | "connection_error"
  | "ka"
  | "data"
  | "error"
  | "complete"

export type GraphqlInboundMessage =
  | { type: "connection_ack" }
  | { type: "connection_error"; payload: Error }
  // The 'ka' means 'connection_keep_alive', it's set as `ka` to save bandwidth
  | { type: "ka" }
  | {
      id: string
      type: "data"
      payload: { data: any; errors?: Error[] }
    }
  | {
      id: string
      type: "error"
      payload: Error
    }
  | {
      id: string
      type: "complete"
    }

export type GraphqlOutboundMessage =
  | { type: "connection_init"; payload?: Record<string, unknown> }
  | { type: "stop"; id: string }
  | GraphqlStartOutboundMessage
  | { type: "connection_terminate" }

export type GraphqlStartOutboundMessage = {
  id: string
  type: "start"
  payload: {
    query: GraphqlDocument
    variables?: GraphqlVariables
    operationName?: string
  }
}

export type GraphqlVariables =
  | Record<string, unknown>
  | (() => Promise<Record<string, unknown>>)
  | (() => Record<string, unknown>)
  | undefined

export type GraphqlResponse<T> = {
  data: T
  errors?: GraphqlResponseError[]
}

export type GraphqlResponseError = {
  message: string
  locations?: { line: number; column: number }[]
  path?: (string | number)[]
  extensions?: Record<string, unknown>
}
