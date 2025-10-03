import { getAppId } from "../appd.js";

async function main() {
  const appId = await getAppId();
  console.log(JSON.stringify({ appId }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
