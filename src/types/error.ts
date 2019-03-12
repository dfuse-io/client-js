export interface ErrorData {
  code: string
  trace_id?: string
  message: string
  details?: { [key: string]: any }
}

export class DfuseError extends Error {
  public description: string
  public cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)

    this.description = message
    this.cause = cause
  }
}

export class DfuseApiError extends DfuseError implements ErrorData {
  public code: string
  public trace_id?: string
  public message: string
  public details?: { [key: string]: any }

  constructor(data: ErrorData, cause?: Error) {
    super(data.message, cause)

    this.code = data.code
    this.trace_id = data.trace_id
    this.message = data.message
    this.details = data.details
  }
}
