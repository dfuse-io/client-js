import { TransactionLifecycle } from "./transaction"

export type SearchSortType = "asc" | "desc"

export interface SearchTransactionsResponse {
  cursor: string
  transactions: SearchTransactionRow[]
  forked_head_warning: boolean
}

export interface SearchTransactionRow {
  lifecycle: TransactionLifecycle
  action_idx: number[]
}
