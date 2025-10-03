import "dotenv/config";
import { readFileSync } from "node:fs";
import { getEvmPrivateKey } from "../appd.js";
import { privateKeyToWallet } from "../keys.js";
import { makeProvider, deployContract } from "../evm.js";

const KEY_ID = process.env.KEY_ID ?? "evm:base:sepolia";
const RPC_URL = process.env.BASE_RPC_URL ?? "https://sepolia.base.org";
const CHAIN_ID = Number(process.env.BASE_CHAIN_ID ?? "84532");

/**
 * Usage:
 *   npm run deploy-contract -- ./artifacts/MyContract.json '[arg0, arg1]'
 * The artifact must contain { abi, bytecode }.
 */
async function main() {
  const [artifactPath, ctorJson = "[]"] = process.argv.slice(2);
  if (!artifactPath) {
    console.error("Usage: npm run deploy-contract -- <artifact.json> '[constructorArgsJson]'");
    process.exit(2);
  }

  const artifactRaw = readFileSync(artifactPath, "utf8");
  const artifact = JSON.parse(artifactRaw);
  const { abi, bytecode } = artifact ?? {};
  if (!abi || !bytecode) {
    throw new Error("Artifact must contain { abi, bytecode }");
  }

  let args: unknown[];
  try {
    args = JSON.parse(ctorJson);
    if (!Array.isArray(args)) throw new Error("constructor args must be a JSON array");
  } catch (e) {
    throw new Error(`Failed to parse constructor args JSON: ${String(e)}`);
  }

  const pk = await getEvmPrivateKey(KEY_ID);
  const wallet = privateKeyToWallet(pk).connect(makeProvider(RPC_URL, CHAIN_ID));
  const { address, receipt } = await deployContract(wallet, abi, bytecode, args);

  console.log(JSON.stringify({ contractAddress: address, txHash: receipt.hash, status: receipt.status }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
