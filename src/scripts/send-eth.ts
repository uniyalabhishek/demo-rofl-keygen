import "dotenv/config";
import { getEvmSecretKey } from "../appd.js";
import { secretKeyToWallet } from "../keys.js";
import { makeProvider, sendEth } from "../evm.js";

const RPC_URL = process.env.BASE_RPC_URL ?? "https://sepolia.base.org";
const CHAIN_ID = Number(process.env.BASE_CHAIN_ID ?? "84532");

async function main() {
  const [to, amount] = process.argv.slice(2);
  if (!to || !amount) {
    console.error("Usage: npm run send-eth -- <toAddress> <amountETH>");
    process.exit(2);
  }
  const sk = await getEvmSecretKey(process.env.KEY_ID ?? "evm:base:sepolia");
  const w = secretKeyToWallet(sk).connect(makeProvider(RPC_URL, CHAIN_ID));
  const rcpt = await sendEth(w, to, amount);
  console.log(
    JSON.stringify({ txHash: rcpt.hash, status: rcpt.status }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
