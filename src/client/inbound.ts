export interface InboundMessage<T> {
  type: InboundMessageType
  req_id?: string
  data: T
}

export enum InboundMessageType {}
