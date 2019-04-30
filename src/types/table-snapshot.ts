import { DbRow } from "./common"

export type TableSnapshotData<T = Record<string, any>> = {
  rows: DbRow<T>[]
}
