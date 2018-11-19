export interface TableDeltaData<T = { [key: string]: any }> {
  block_num: number
  dbop: DbOp<T>
  step: string
}

export interface DbOp<T> {
  op?: string
  action_idx: number
  account?: string
  table?: string
  scope?: string
  key?: string
  old?: DbRow<T>
  new?: DbRow<T>
}

export interface DbRow<T> {
  key?: string
  payer?: string
  hex?: string
  json?: T
  error?: string
}
