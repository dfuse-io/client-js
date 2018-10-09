import * as path from "path";
import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config({path: path.join(__dirname, "..", ".env")});

export const EOSWS_API_KEY = process.env.EOSWS_API_KEY;

if (!EOSWS_API_KEY) { throw new Error("missing EOSWS_API_KEY in your environment variables"); }

const origin = "https://github.com/eos-nation/eosws";
export const ws = new WebSocket(`wss://eosws.mainnet.eoscanada.com/v1/stream?token=${EOSWS_API_KEY}`, {origin});
