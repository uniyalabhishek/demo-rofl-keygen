# demo-rofl-keygen

- **Generates an EVM secp256k1 key inside ROFL** via the `appd` REST API
  (UNIX socket `/run/rofl-appd.sock`).
- Derives the **EVM address**, **signs** a message, **deploys a contract**,
  and **sends** an EIP‑1559 transaction on **Base Sepolia (chainId 84532)**.
- Runs a **smoke test** on container start that demonstrates key generation,
  message signing, and contract deployment (prints to logs), then idles so
  you can inspect the output with the Oasis CLI.

- **Security**: Never log or print secret keys. ROFL machine logs are not
  encrypted at rest — keep secrets confined to the TEE.

## 1) Prerequisites

- **Node 20+**
- **Docker** with **buildx**
- **Oasis CLI** (`oasis`) configured; some TEST funds on **Sapphire
  Testnet** for `rofl create/deploy`.
- An account on **Docker Hub** or **GHCR** to push your image.

## 2) Configure environment

Copy and edit the `.env`:

```shell
cp .env.example .env
# Set IMAGE to your registry location (FQDN), e.g.:
#   docker.io/<youruser>/demo-rofl-keygen:0.1.0
# or
#   ghcr.io/<your-gh-username-or-org>/demo-rofl-keygen:0.1.0
#
# Optional local-only development (outside ROFL):
#   Set LOCAL_DEV_SK to a throwaway 0x<64-hex> secret key and
#   ALLOW_LOCAL_DEV=true (fallback is used only when /run/rofl-appd.sock
#   is not present).
```

Defaults target **Base Sepolia**
(`BASE_RPC_URL=https://sepolia.base.org`, `BASE_CHAIN_ID=84532`).

## 3) Install & build locally

Use **npm ci** for reproducible installs (uses the lockfile exactly).

```shell
npm ci
npm run build:all   # compiles TS + Counter.sol via Hardhat
```

Local development (outside ROFL) — **dev only**:

```shell
export LOCAL_DEV_SK=0x<throwaway_secret_key>  # DO NOT USE IN PRODUCTION
export ALLOW_LOCAL_DEV=true
# CLI helpers:
npm run get-address
npm run sign-message -- "hello from rofl"
# Deploy:
npm run deploy-counter
# Send ETH:
npm run send-eth -- 0xYourSepoliaAddress 0.001
# Note: get-app-id requires /run/rofl-appd.sock (i.e., inside ROFL).
```

## 4) Build & push the container image (Docker Hub or GHCR)

- **Apple Silicon (M1/M2/M3)**: ROFL runs on **x86_64/TDX**, so build
  **amd64** images.

### Docker Hub

```shell
docker login
docker buildx build \
  --platform linux/amd64 \
  -t docker.io/<youruser>/demo-rofl-keygen:0.1.0 \
  --push .
```

### GHCR

```shell
echo $CR_PAT | docker login ghcr.io -u <your-gh-username-or-org> --password-stdin
docker buildx build \
  --platform linux/amd64 \
  -t ghcr.io/<your-gh-username-or-org>/demo-rofl-keygen:0.1.0 \
  --push .
```

**(Recommended)** Pin the digest for integrity:

```shell
docker buildx imagetools inspect <REGISTRY>/<ns>/demo-rofl-keygen:0.1.0
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
docker run --platform linux/amd64 --volume "$PWD":/src \
  -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build
```

## 6) View the smoke-test output

The container runs a smoke test on startup and then idles. Inspect logs:

```shell
oasis rofl machine logs
```

**Expected flow:**

1. Prints **App ID** (inside ROFL).
2. Prints **EVM address** and a **signed message**.
3. Prompts you to **fund the address** with Base Sepolia ETH.
4. After funding, it **deploys Counter.sol**.

To send ETH back or to another address, use the CLI:

```shell
npm run send-eth -- 0xRecipientAddress 0.001
```

## 7) Notes & Troubleshooting

- **appd socket**: The UNIX socket must be mounted at `/run/rofl-appd.sock`
  (see `compose.yaml`). It exists **only inside** a ROFL machine.
- **Local dev fallback**: If `/run/rofl-appd.sock` is missing and you set
  `ALLOW_LOCAL_DEV=true` + `LOCAL_DEV_SK=0x<64-hex>`, the app will use the
  local secret key **for dev only**.
- **Logs**: Don’t print secrets — ROFL logs are not encrypted on the
  provider.
- **Apple Silicon**: Always build/push `--platform linux/amd64`. The
  `compose.yaml` also sets `platform: linux/amd64`.
- **RPC limits**: Public RPCs are rate-limited; prefer a dedicated Base RPC.

## 8) Useful scripts

- `npm run get-address`
- `npm run sign-message -- "hello"`
- `npm run deploy-counter`
- `npm run send-eth -- 0x.. 0.001`
- `npm run smoke-test` (runs locally after `npm run build`)
