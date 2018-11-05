export interface InboundMessage<T> {
  type: string
  req_id?: string
  data: T
}
