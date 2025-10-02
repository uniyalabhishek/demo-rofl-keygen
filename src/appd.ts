import { request } from "node:http";
import { existsSync } from "node:fs";

/**
 * The public docs list "raw-386" (meant as 384-bit entropy). Accept both spellings for compatibility.
 */
export type KeyKind = "secp256k1" | "ed25519" | "raw-256" | "raw-384" | "raw-386";

/**
 * generateKey
 * Calls appd REST: POST /rofl/v1/keys/generate over the UNIX socket /run/rofl-appd.sock
 * Returns a 0x-prefixed hex private key string.
 */
export async function generateKey(keyId: string, kind: KeyKind = "secp256k1"): Promise<string> {
  const socketPath = "/run/rofl-appd.sock";
  const payload = JSON.stringify({ key_id: keyId, kind });

  if (!existsSync(socketPath)) {
    throw new Error(
      "rofl-appd socket not found at /run/rofl-appd.sock. " +
        "This endpoint only works inside a ROFL machine."
    );
  }

  return new Promise((resolve, reject) => {
    const req = request(
      {
        method: "POST",
        socketPath,
        path: "/rofl/v1/keys/generate",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload).toString()
        }
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            const hex = parsed?.key as string | undefined;
            if (!hex || typeof hex !== "string") return reject(new Error(`Bad response: ${body}`));
            const pk = hex.startsWith("0x") ? hex : `0x${hex}`;
            resolve(pk);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

/**
 * getEvmPrivateKey
 * Wrapper that first tries ROFL keygen. If not available and LOCAL_DEV_PK is set,
 * returns that for local development convenience.
 */
export async function getEvmPrivateKey(keyId: string): Promise<string> {
  try {
    return await generateKey(keyId, "secp256k1");
  } catch (err) {
    const fallback = process.env.LOCAL_DEV_PK;
    if (fallback && /^0x[0-9a-fA-F]{64}$/.test(fallback)) {
      return fallback;
    }
    throw err;
  }
}
