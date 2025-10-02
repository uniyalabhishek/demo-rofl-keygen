import "dotenv/config";
import { getEvmPrivateKey } from "../appd.js";
import { privateKeyToWallet, checksumAddress } from "../keys.js";
import { makeProvider } from "../evm.js";

const KEY_ID = process.env.KEY_ID ?? "evm:base:sepolia";
const RPC_URL = process.env.BASE_RPC_URL ?? "https://sepolia.base.org";
const CHAIN_ID = Number(process.env.BASE_CHAIN_ID ?? "84532");

async function main() {
  const pk = await getEvmPrivateKey(KEY_ID);
  const w = privateKeyToWallet(pk).connect(makeProvider(RPC_URL, CHAIN_ID));
  console.log(JSON.stringify({ keyId: KEY_ID, address: checksumAddress(w.address), chainId: CHAIN_ID }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
