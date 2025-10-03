# demo-rofl-keygen

- **Generates an EVM secp256k1 key inside ROFL** via the `appd` REST API (UNIX socket `/run/rofl-appd.sock`).
- Derives the **EVM address** and **signs & sends** an EIP-1559 transaction on **Base Sepolia (chainId 84532)**.
- **Deploys a sample contract** (`Counter.sol`) using the **ROFL key** — exposed via an HTTP endpoint for simplicity.
- Exposes the **ROFL App ID** and basic runtime info to correlate on-chain state.

- **Security**: Never log or print private keys. ROFL machine logs are **not encrypted**; the admin can access them, but they’re stored unencrypted on the node — keep secrets inside the TEE.

## 1) Prerequisites

- **Node 20+**
- **Docker** with **buildx**
- **Oasis CLI** (`oasis`) configured; some TEST funds on **Sapphire Testnet** for `rofl create/deploy`.
- An account on **Docker Hub** or **GHCR** to push the application image.

## 2) Configure environment

Copy and edit the `.env`:

```shell
cp .env.example .env
# Set IMAGE to your registry location (FQDN), e.g.:
#   docker.io/<youruser>/demo-rofl-keygen:0.2.0
# or
#   ghcr.io/<your-gh-username-or-org>/demo-rofl-keygen:0.2.0
#
# Optional local-only development (outside ROFL):
#   Set LOCAL_DEV_PK to a throwaway 0x<64-hex> key, and ALLOW_LOCAL_DEV=true
#   (fallback only used when /run/rofl-appd.sock is not present).
```

Defaults target **Base Sepolia** (`BASE_RPC_URL=https://sepolia.base.org`, `BASE_CHAIN_ID=84532`).

## 3) Install & build locally

Use **npm ci** for reproducible installs (uses the lockfile exactly).

```shell
npm ci
npm run build:all   # compiles TS + Counter.sol via Hardhat
```

Local development (outside ROFL) for convenience — **dev only**:

```shell
export LOCAL_DEV_PK=0x<throwaway_private_key>  # DO NOT USE IN PRODUCTION
export ALLOW_LOCAL_DEV=true
npm run dev
# GET  http://localhost:8080/app-id
# GET  http://localhost:8080/address
# GET  http://localhost:8080/info
# POST http://localhost:8080/sign-message {"message":"hello"}
# POST http://localhost:8080/send-eth {"to":"0x...","amount":"0.001"}
# POST http://localhost:8080/deploy-counter {}
```

## 4) Build & push the container image (Docker Hub or GHCR)

- **Apple Silicon (M1/M2/M3)**: ROFL runs on **x86_64/TDX**, so **build amd64** images.

### Docker Hub

```shell
docker login
docker buildx build \
  --platform linux/amd64 \
  -t docker.io/<youruser>/demo-rofl-keygen:0.2.0 \
  --push .
```

### GHCR

```shell
echo $CR_PAT | docker login ghcr.io -u <your-gh-username-or-org> --password-stdin
docker buildx build \
  --platform linux/amd64 \
  -t ghcr.io/<your-gh-username-or-org>/demo-rofl-keygen:0.2.0 \
  --push .
```

**(Recommended)** Pin the digest for integrity:

```shell
docker buildx imagetools inspect <REGISTRY>/<ns>/demo-rofl-keygen:0.2.0
# Then set IMAGE=...@sha256:<digest> in .env
```

## 5) ROFLize (register, build, update, deploy)

From the repository root:

```shell
# Initialize manifest for this repo (creates rofl.yaml).
oasis rofl init

# Register the app on Sapphire Testnet and set admin
oasis rofl create --network testnet

# Build the ROFL bundle (packages compose.yaml + metadata)
oasis rofl build

# Push policy/config changes on-chain (if any)
oasis rofl update

# Deploy the app to a ROFL machine from the marketplace
oasis rofl deploy
```

If `oasis rofl build` fails on Apple Silicon, use the official builder:

```shell
docker run --platform linux/amd64 --volume "$PWD":/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build
```

## 6) Find your public HTTPS URL

ROFL Proxy mints a URL for each published port. Get it with:

```shell
oasis rofl machine show
```

Look for the **Proxy** section, e.g.:

```text
Proxy:
  Domain: m602.test-proxy-b.rofl.app
  Ports from compose file:
    8080 (demo): https://p8080.m602.test-proxy-b.rofl.app
```

## 7) End-to-end flow (Base Sepolia)

1. **Get the ROFL App ID** (useful for correlating on-chain state):

   ```shell
   curl -s https://p8080.<...>.rofl.app/app-id | jq
   # → {"appId":"rofl1..."}
   ```

2. **Get the ROFL key address**:

   ```shell
   curl -s https://p8080.<...>.rofl.app/address | jq
   # → {"keyId":"evm:base:sepolia","address":"0x...","chainId":84532}
   ```

3. **Fund the address** with Base Sepolia ETH (use any faucet / provider).

4. **Sign a message**:

   ```shell
   curl -s -X POST https://p8080.<...>.rofl.app/sign-message \
     -H 'content-type: application/json' \
     -d '{"message":"hello from rofl"}' | jq
   ```

5. **Deploy a contract via the ROFL key (HTTP)**:

   ```shell
   curl -s -X POST https://p8080.<...>.rofl.app/deploy-counter \
     -H 'content-type: application/json' -d '{}' | jq
   # → {"contractAddress":"0x...","txHash":"0x...","status":1}
   ```

   **Alternatively (CLI inside the container image):**

   ```shell
   # Uses the compiled artifact that is baked into the image.
   npm run deploy-counter
   # or a generic artifact path:
   npm run deploy-contract -- ./artifacts/contracts/Counter.sol/Counter.json '[]'
   ```

6. **Send ETH back** to your wallet:

   ```shell
   curl -s -X POST https://p8080.<...>.rofl.app/send-eth \
     -H 'content-type: application/json' \
     -d '{"to":"0xYourSepoliaAddress","amount":"0.001"}' | jq
   ```

7. **Verify the tx** on a Base Sepolia explorer (e.g., BaseScan).

## 8) Notes & Troubleshooting

- **appd socket**: The UNIX socket must be mounted at `/run/rofl-appd.sock` (see `compose.yaml`). It exists **only inside** a ROFL machine.
- **Local dev fallback**: If `/run/rofl-appd.sock` is missing and you set `ALLOW_LOCAL_DEV=true` + `LOCAL_DEV_PK=0x<64-hex>`, the app will use the local key **for dev only**.
- **Logs**: Don’t print secrets — ROFL logs are not encrypted on the provider.
- **Apple Silicon**: Always build/push `--platform linux/amd64`. The `compose.yaml` also sets `platform: linux/amd64`.
- **RPC limits**: Public RPCs are rate-limited; use a dedicated provider for sustained load.

## 9) API Summary

- `GET /health` → `{ ok: true }`
- `GET /app-id` → `{ appId }`
- `GET /info` → `{ keyId, chainId, rpcHost, appId }`
- `GET /address` → `{ keyId, address, chainId }`
- `POST /sign-message { "message": "<string>" }` → `{ signature, address }`
- `POST /send-eth { "to": "0x..40 hex..", "amount": "0.001" }` → `{ txHash, status }`
- `POST /deploy-counter {}` → `{ contractAddress, txHash, status }`
