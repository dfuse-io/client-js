import { DbRow } from "./table-delta"

export type TableSnapshotData<T = Record<string, any>> = {
  rows: Array<DbRow<T>>
}
