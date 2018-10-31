export type MessageHandler<T> = (data: T) => void
export interface MessageHandlerMap {
  [key: string]: MessageHandler<any>
}

// Message (Inbound)

export interface SocketInboundMessage<T> {
  type: SocketInboundMessageType
  req_id?: string
  data: T
}

export enum SocketInboundMessageType {
  PRICE = "price",
  BLOCK_HEADER = "block_header",
  TRANSACTION_TRACES = "transaction_traces",
  TRANSACTION_LIFECYCLE = "transaction_life_cycle",
  ERROR = "error",
  GET_HEAD_INFO = "get_head_info",
  SIGNED_BLOCK = "signed_block",
  PING = "ping",
  TRANSACTION = "transaction",
  VOTE_TALLY = "vote_tally",
  FORUM_POST = "forum_post",
  FORUM_PROPOSITION = "forum_proposition"
}

// Message (Outbound)

export interface SocketOutboundMessage<T> {
  type: SocketOutboundMessageType
  listen?: boolean
  req_id?: string
  data: T
}

export enum SocketOutboundMessageType {
  GET_HEAD_INFO = "get_head_info",
  GET_INFO = "get_info",
  GET_TRANSACTION = "get_transaction",
  GET_TRANSACTION_LIFECYCLE = "get_transaction_life_cycle",
  GET_FORUM_POST = "get_forum_post",
  GET_FORUM_PROPOSITION = "get_forum_proposition",
  GET_VOTE_TALLY = "get_vote_tally",
  METRICS = "metrics",
  PONG = "pong"
}

// Message (Error)

export interface SocketErrorMessage {
  type: "error"
  req_id: string
  data: {
    code: SocketErrorCode
    message: string
  }
}

export enum SocketErrorCode {
  // Client specific
  SOCKET_DOWN = "socket_down",
  UNKNOWN_ERROR = "unknown_error",

  // Server specific
  INVALID_MESSAGE_TYPE = "invalid_message_type",
  UNMARSHAL_ERROR = "unmarshal_error",
  TRANSACTION_NOT_FOUND = "tx_not_found"
}

export interface SubscriptionMessage {
  type: SocketOutboundMessageType
  data?: any
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4()
}

export abstract class StreamHandler {
  public id: string = guid()
  protected subscriptionMessage: SubscriptionMessage
  protected messageHandlers: { [key: string]: MessageHandler<any> } = {}
  protected logger: any
  protected senderFunction: (args: any, args2: any) => any

  constructor(
    subscriptionMessage: SubscriptionMessage,
    senderFunction: (args: any, args2: any) => any,
    logger: any
  ) {
    this.subscriptionMessage = subscriptionMessage
    this.logger = logger
    this.senderFunction = senderFunction
  }

  get type() {
    return this.subscriptionMessage.type
  }

  public handles(messageHandlers: MessageHandlerMap) {
    this.messageHandlers = messageHandlers
    console.log("message hadnlers: ", this.messageHandlers)
  }

  public async subscribe() {
    try {
      this.logger.info(
        "About to subscribe to stream type [%s] using id [%s].",
        this.subscriptionMessage.type,
        this.id
      )

      await this.sendFlowMessage({ listen: true })

      this.onSubscribed()
    } catch (error) {
      this.onSubscribeError(error)
    }
  }

  public async resubscribe() {
    try {
      this.logger.info(
        "About to re-subscribe to stream type [%s] using id [%s].",
        this.type,
        this.id
      )

      await this.sendFlowMessage({ listen: true })
    } catch (error) {
      // TODO: Should we actually handle it differently?
      this.onSubscribeError(error)
    }
  }

  public async unsubscribe() {
    try {
      this.logger.info(
        "About to unsubscribe from stream type [%s] using id [%s].",
        this.type,
        this.id
      )

      await this.sendFlowMessage({ listen: false })

      this.onUnsubcribed()
    } catch (error) {
      // We don't care about error here
    }
  }

  public onSocketMessage(message: SocketInboundMessage<any> | SocketErrorMessage) {
    if (message.type === SocketInboundMessageType.ERROR) {
      this.handleErrorMessage(message as SocketErrorMessage)
      return
    }

    const handler = this.messageHandlers[message.type]

    if (handler === undefined) {
      return
    }

    handler(message.data)
  }

  public onSubscribed() {
    // Does nothing by default
  }

  public onUnsubcribed() {
    // Does nothing by default
  }

  public onSubscribeError(error: Error) {
    // Does nothing by default
  }

  public onErrorMessage(message: SocketErrorMessage) {
    // Does nothing by default
  }

  private sendFlowMessage(options: { listen: boolean }) {
    return this.senderFunction(
      {
        type: this.subscriptionMessage.type,
        req_id: this.id,
        listen: options.listen,
        data: this.subscriptionMessage.data
      },
      false
    )
  }

  private handleErrorMessage(message: SocketErrorMessage) {
    if (message.data.code === SocketErrorCode.INVALID_MESSAGE_TYPE) {
      // We ignore this error for now
      return
    }

    this.onErrorMessage(message)
  }
}
