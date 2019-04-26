export type ComparisonOperator = "gt" | "gte" | "lt" | "lte" | "eq"

export type BlockIdByTimeResponse = {
  block: {
    id: string
    num: number
    time: string
  }
}
