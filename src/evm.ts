import { JsonRpcProvider, Wallet, parseEther, type TransactionReceipt, ContractFactory } from "ethers";

export function makeProvider(rpcUrl: string, chainId: number) {
  return new JsonRpcProvider(rpcUrl, chainId);
}

export function connectWallet(pkHex: string, rpcUrl: string, chainId: number): Wallet {
  const w = new Wallet(pkHex);
  return w.connect(makeProvider(rpcUrl, chainId));
}

export async function signPersonalMessage(wallet: Wallet, msg: string) {
  return wallet.signMessage(msg);
}

export async function sendEth(wallet: Wallet, to: string, amountEth: string): Promise<TransactionReceipt> {
  // Let the provider populate EIP-1559 fee fields; this is robust and avoids TS optional/null issues.
  const tx = await wallet.sendTransaction({
    to,
    value: parseEther(amountEth)
  });

  const receipt = await tx.wait();
  if (receipt == null) {
    throw new Error("Transaction dropped or replaced before confirmation");
  }
  return receipt;
}

export async function deployContract(
  wallet: Wallet,
  abi: any[],
  bytecode: string,
  args: unknown[] = []
): Promise<{ address: string; receipt: TransactionReceipt }> {
  const factory = new ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(...args);
  const deployTx = contract.deploymentTransaction();
  const receipt = await deployTx?.wait();
  await contract.waitForDeployment();
  if (!receipt) {
    throw new Error("Deployment TX not mined");
  }
  return { address: contract.target as string, receipt };
}
