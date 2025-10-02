# demo-rofl-keygen

Minimal, production-quality example that:

- **Generates an EVM secp256k1 key inside ROFL** via the `appd` REST API (UNIX socket `/run/rofl-appd.sock`).
- Derives the **EVM address** and **signs & sends** an EIP-1559 transaction on **Base Sepolia (chainId 84532)**.

## Docs references

- `appd` REST (UNIX socket & `/rofl/v1/keys/generate`, `/rofl/v1/tx/sign-submit`): <https://docs.oasis.io/build/rofl/features/rest/>
- ROFL Proxy (public HTTPS URL per published port): <https://docs.oasis.io/build/rofl/features/proxy/>
- ROFL CLI (init, create, build, update, deploy, machine show): <https://docs.oasis.io/general/manage-tokens/cli/rofl/>
- Base Sepolia RPC & chain id: <https://docs.base.org/network-information>

- **Security**: Never log or print private keys. ROFL machine logs are **not encrypted**; only the admin can access them, but they’re stored unencrypted on the node—so don’t print secrets. Keep secrets inside the TEE. See the official warning in the CLI/Deployment docs.

## 1) Prerequisites

- **Node 20+**
- **Docker** with **buildx**
- **Oasis CLI** (`oasis`) configured; some TEST funds on **Sapphire Testnet** for `rofl create/deploy`.
- An account on **Docker Hub** or **GHCR** to push the application image.

## 2) Configure environment

Copy and edit the `.env`:

```bash
cp .env.example .env
# Edit IMAGE= to your registry location (FQDN required), e.g.:
#   docker.io/<youruser>/demo-rofl-keygen:0.1.0
# or
#   ghcr.io/<your-gh-username-or-org>/demo-rofl-keygen:0.1.0
#
# Optional: for local-only development (outside ROFL), you may set LOCAL_DEV_PK to a throwaway 0x<64-hex> key.
```

Defaults target **Base Sepolia** (`BASE_RPC_URL=https://sepolia.base.org`, `BASE_CHAIN_ID=84532`).

## 3) Install & build locally

Use **npm ci** for reproducible installs (uses the lockfile exactly).
Use **npm install** only when you intentionally want to update the lockfile.

```bash
npm ci
npm run build
```

Local development (outside ROFL) for convenience—**dev only**:

```bash
export LOCAL_DEV_PK=0x<throwaway_private_key>  # DO NOT USE IN PRODUCTION
npm run dev
# GET  http://localhost:8080/address
# POST http://localhost:8080/sign-message {"message":"hello"}
# POST http://localhost:8080/send-eth {"to":"0x...","amount":"0.001"}
```

## 4) Build & push the container image (Docker Hub or GHCR)

- **Apple Silicon (M1/M2/M3)**: ROFL runs on **x86_64/TDX**, so build and push an **amd64** image.

### Docker Hub

```bash
docker login
docker buildx build \
  --platform linux/amd64 \
  -t docker.io/<youruser>/demo-rofl-keygen:0.1.0 \
  --push .
```

### GHCR

```bash
echo $CR_PAT | docker login ghcr.io -u <your-gh-username-or-org> --password-stdin
docker buildx build \
  --platform linux/amd64 \
  -t ghcr.io/<your-gh-username-or-org>/demo-rofl-keygen:0.1.0 \
  --push .
```

**(Recommended)** Pin the digest for integrity:

```bash
# Inspect to get the sha256 digest
docker buildx imagetools inspect <REGISTRY>/<ns>/demo-rofl-keygen:0.1.0
# Then set IMAGE to include the digest, e.g.:
# IMAGE=docker.io/<user>/demo-rofl-keygen:0.1.0@sha256:<digest>
# or
# IMAGE=ghcr.io/<org>/demo-rofl-keygen:0.1.0@sha256:<digest>
```

Confirm `.env` has `IMAGE=` pointing to your pushed image (FQDN + optional `@sha256:<digest>`).

## 5) ROFLize (register, build, update, deploy)

From the repository root:

```bash
# Initialize manifest for this repo (creates rofl.yaml).
oasis rofl init

# Register the app on Sapphire Testnet and set admin
oasis rofl create --network testnet

# Build the ROFL bundle (deterministically packages compose.yaml + metadata)
oasis rofl build

# Push policy/config changes on-chain (if any)
oasis rofl update

# Deploy the app to a ROFL machine from the marketplace
oasis rofl deploy
```

If `oasis rofl build` fails on Apple Silicon, use the official builder container:

```bash
 docker run --platform linux/amd64 --volume "$PWD":/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build
```

## 6) Find your public HTTPS URL

ROFL Proxy mints a URL for each published port. Get it with:

```bash
oasis rofl machine show
```

Look for the **Proxy** section, e.g.:

```text
Proxy:
  Domain: m602.test-proxy-b.rofl.app
  Ports from compose file:
    8080 (demo): https://p8080.m602.test-proxy-b.rofl.app
```

## 7) Run the end-to-end flow (Base Sepolia)

1. **Get the ROFL key address**:

   ```bash
   curl -s https://p8080.<...>.rofl.app/address | jq
   # → {"keyId":"evm:base:sepolia","address":"0x...","chainId":84532}
   ```

2. **Fund the address** with Base Sepolia ETH (use any faucet).

3. **Sign a message**:

   ```bash
   curl -s -X POST https://p8080.<...>.rofl.app/sign-message \
     -H 'content-type: application/json' \
     -d '{"message":"hello from rofl"}' | jq
   ```

4. **Send ETH back** to your wallet:

   ```bash
   curl -s -X POST https://p8080.<...>.rofl.app/send-eth \
     -H 'content-type: application/json' \
     -d '{"to":"0xYourSepoliaAddress","amount":"0.001"}' | jq
   ```

5. **Verify the tx** on a Base Sepolia explorer (e.g., [https://sepolia.basescan.org/](https://sepolia.basescan.org/)).

## 8) Notes & Troubleshooting

- **appd socket**: The UNIX socket must be mounted at `/run/rofl-appd.sock` (see `compose.yaml`). This only exists **inside** a ROFL machine.
- **Logs**: Don’t print secrets—ROFL logs are not encrypted on the provider.
- **Apple Silicon**: Always build/push `--platform linux/amd64`. The `compose.yaml` also specifies `platform: linux/amd64`.
- **RPC limits**: Public RPCs are rate-limited; for production, use a dedicated provider.

## 9) API Summary

- `GET /health` → `{ ok: true }`
- `GET /address` → `{ keyId, address, chainId }`
- `POST /sign-message { "message": "<string>" }` → `{ signature, address }`
- `POST /send-eth { "to": "0x..40 hex..", "amount": "0.001" }` → `{ txHash, status }`
