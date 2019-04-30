import { DbOp } from "./common"

export type TableDeltaData<T = Record<string, any>> = {
  block_num: number
  block_id: string
  dbop: DbOp<T>
  step: "new" | "undo" | "redo"
}
