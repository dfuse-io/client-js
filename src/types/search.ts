import { TransactionLifecycle } from "./transaction"

export type SearchSortType = "asc" | "desc"

export type SearchTransactionsResponse = {
  cursor: string
  transactions?: SearchTransactionRow[]
  forked_head_warning: boolean
}

export type SearchTransactionRow = {
  lifecycle: TransactionLifecycle
  action_idx: number[]
}
