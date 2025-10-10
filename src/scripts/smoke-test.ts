import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getAppId,
  getEvmSecretKey
} from "../appd.js";
import {
  secretKeyToWallet,
  checksumAddress
} from "../keys.js";
import {
  makeProvider,
  signPersonalMessage,
  deployContract
} from "../evm.js";
import {
  formatEther,
  JsonRpcProvider
} from "ethers";

const RPC_URL = process.env.BASE_RPC_URL ?? "https://sepolia.base.org";
const CHAIN_ID = Number(process.env.BASE_CHAIN_ID ?? "84532");
const KEY_ID = process.env.KEY_ID ?? "evm:base:sepolia";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForFunding(
  provider: JsonRpcProvider,
  addr: string,
  minWei: bigint = 1n,
  timeoutMs = 15 * 60 * 1000,
  pollMs = 5_000
): Promise<bigint> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const bal = await provider.getBalance(addr);
    if (bal >= minWei) return bal;
    console.log(
      `Waiting for funding... current balance=${formatEther(bal)} ETH`
    );
    await sleep(pollMs);
  }
  throw new Error("Timed out waiting for funding.");
}

async function main() {
  const appId = await getAppId().catch(() => null);
  console.log(`ROFL App ID: ${appId ?? "(unavailable outside ROFL)"}`);

  const sk = await getEvmSecretKey(KEY_ID);
  const wallet = secretKeyToWallet(sk).connect(
    makeProvider(RPC_URL, CHAIN_ID)
  );
  const addr = checksumAddress(await wallet.getAddress());
  console.log(`EVM address (Base Sepolia): ${addr}`);

  const msg = "hello from rofl";
  const sig = await signPersonalMessage(wallet, msg);
  console.log(`Signed message: "${msg}"`);
  console.log(`Signature: ${sig}`);

  const provider = wallet.provider as JsonRpcProvider;

  let bal = await provider.getBalance(addr);
  if (bal === 0n) {
    console.log(
      "Please fund the above address with Base Sepolia ETH to continue."
    );
    bal = await waitForFunding(provider, addr);
  }
  console.log(`Balance detected: ${formatEther(bal)} ETH`);

  // Deploy Counter.sol (artifact must be baked into the image).
  const artifactPath = join(
    process.cwd(),
    "artifacts",
    "contracts",
    "Counter.sol",
    "Counter.json"
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  if (!artifact?.abi || !artifact?.bytecode) {
    throw new Error("Counter artifact missing abi/bytecode");
  }
  const { address: contractAddress, receipt: deployRcpt } =
    await deployContract(wallet, artifact.abi, artifact.bytecode, []);
  console.log(
    `Deployed Counter at ${contractAddress} (tx=${deployRcpt.hash})`
  );

  console.log("Smoke test completed successfully!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
