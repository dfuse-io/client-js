import { BlockInfo } from "demux";

function parseTokenString(tokenString: string) {
    const [amountString, symbol] = tokenString.split(" ");
    const amount = parseFloat(amountString);
    return { amount, symbol };
  }

function updateTransferData(state: any, payload: any, blockInfo: BlockInfo, context: any) {
    const { amount, symbol } = parseTokenString(payload.data.quantity);
    if (!state.volumeBySymbol[symbol]) {
      state.volumeBySymbol[symbol] = amount;
    } else {
      state.volumeBySymbol[symbol] += amount;
    }
    state.totalTransfers += 1;
  }

const updaters = [
    {
      actionType: "eosio.token::transfer",
      updater: updateTransferData,
    },
  ];

export default updaters;
