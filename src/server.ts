import "dotenv/config";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { getEvmPrivateKey } from "./appd.js";
import { privateKeyToWallet, checksumAddress } from "./keys.js";
import { makeProvider, signPersonalMessage, sendEth } from "./evm.js";

const app = express();
app.use(express.json());

const KEY_ID = process.env.KEY_ID ?? "evm:base:sepolia";
const RPC_URL = process.env.BASE_RPC_URL ?? "https://sepolia.base.org";
const CHAIN_ID = Number(process.env.BASE_CHAIN_ID ?? "84532");

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get("/address", async (_req: Request, res: Response) => {
  try {
    const pk = await getEvmPrivateKey(KEY_ID);
    const w = privateKeyToWallet(pk).connect(makeProvider(RPC_URL, CHAIN_ID));
    res.json({ keyId: KEY_ID, address: checksumAddress(w.address), chainId: CHAIN_ID });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "internal error" });
  }
});

app.post("/sign-message", async (req: Request, res: Response) => {
  try {
    const schema = z.object({ message: z.string().min(1) });
    const { message } = schema.parse(req.body);
    const pk = await getEvmPrivateKey(KEY_ID);
    const w = privateKeyToWallet(pk);
    const sig = await signPersonalMessage(w, message);
    res.json({ signature: sig, address: checksumAddress(w.address) });
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "bad request" });
  }
});

app.post("/send-eth", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      to: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      amount: z.string().regex(/^\d+(\.\d+)?$/)
    });
    const { to, amount } = schema.parse(req.body);

    // Normalize and validate checksum; will throw on invalid input.
    const toChecksummed = checksumAddress(to);

    const pk = await getEvmPrivateKey(KEY_ID);
    const w = privateKeyToWallet(pk).connect(makeProvider(RPC_URL, CHAIN_ID));
    const receipt = await sendEth(w, toChecksummed, amount);
    res.json({ txHash: receipt.hash, status: receipt.status });
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "bad request" });
  }
});

const port = Number(process.env.PORT ?? "8080");
app.listen(port, () => {
  // Avoid logging secrets; simple startup log only.
  console.log(`demo-rofl-keygen listening on :${port}`);
});
