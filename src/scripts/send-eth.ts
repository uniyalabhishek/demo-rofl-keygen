import "dotenv/config";
import { getEvmPrivateKey } from "../appd.js";
import { privateKeyToWallet } from "../keys.js";
import { makeProvider, sendEth } from "../evm.js";

const RPC_URL = process.env.BASE_RPC_URL ?? "https://sepolia.base.org";
const CHAIN_ID = Number(process.env.BASE_CHAIN_ID ?? "84532");

async function main() {
  const [to, amount] = process.argv.slice(2);
  if (!to || !amount) {
    console.error("Usage: npm run send-eth -- <toAddress> <amountETH>");
    process.exit(2);
  }
  const pk = await getEvmPrivateKey(process.env.KEY_ID ?? "evm:base:sepolia");
  const w = privateKeyToWallet(pk).connect(makeProvider(RPC_URL, CHAIN_ID));
  const rcpt = await sendEth(w, to, amount);
  console.log(JSON.stringify({ txHash: rcpt.hash, status: rcpt.status }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
