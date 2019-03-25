export interface ErrorData {
  code: string
  trace_id?: string
  message: string
  details: { [key: string]: any }
}
