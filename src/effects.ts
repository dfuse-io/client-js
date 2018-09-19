import { BlockInfo } from "demux";

function logUpdate(state: any, payload: any, blockInfo: BlockInfo, context: any) {
    console.info("State updated:\n", JSON.stringify(state, null, 2));
}

const effects = [
    {
        actionType: "eosio.token::transfer",
        effect: logUpdate,
    },
];

export default effects;
