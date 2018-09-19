import { AbstractActionHandler, Block } from "demux";
import { NodeosBlock } from "demux-eos";
import initialState from "./state";

export default class ObjectActionHandler extends AbstractActionHandler {
  public async handleWithState(handle: any) {
    await handle(initialState);
  }

  public async loadIndexState() {
    return initialState.indexState;
  }

  public async updateIndexState(state: any, block: Block, isReplay: boolean, context: any) {
    state.indexState.blockNumber = block.blockInfo.blockNumber;
    state.indexState.blockHash = block.blockInfo.blockHash;
  }
  public async rollbackTo(blockNumber: number) {
    throw new Error("not implemented");
  }
}
