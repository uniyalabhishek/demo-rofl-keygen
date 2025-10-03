import "dotenv/config";
import { getEvmPrivateKey } from "../appd.js";
import { privateKeyToWallet, checksumAddress } from "../keys.js";

async function main() {
  const msg = process.argv.slice(2).join(" ");
  if (!msg) {
    console.error("Usage: npm run sign-message -- \"your message\"");
    process.exit(2);
  }
  const pk = await getEvmPrivateKey(process.env.KEY_ID ?? "evm:base:sepolia");
  const w = privateKeyToWallet(pk);
  const sig = await w.signMessage(msg);
  console.log(JSON.stringify({ message: msg, signature: sig, address: checksumAddress(w.address) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
