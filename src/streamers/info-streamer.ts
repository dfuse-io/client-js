import { SocketInboundMessageType, SocketOutboundMessageType } from "./common"
import { StreamHandler } from "./common"

export class GetInfoStreamHandler extends StreamHandler {
  constructor(senderFunction: (args: any, args2: any) => any, logger: any) {
    super({ type: SocketOutboundMessageType.GET_HEAD_INFO }, senderFunction, logger)

    this.handles({
      [SocketInboundMessageType.GET_HEAD_INFO]: this.onGetInfo
    })
  }

  public onGetInfo = async (payload: object) => {
    console.log(payload)
  }
}
