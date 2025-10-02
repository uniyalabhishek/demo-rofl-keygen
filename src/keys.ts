import { Wallet, getAddress } from "ethers";

export function privateKeyToWallet(pkHex: string): Wallet {
  return new Wallet(pkHex);
}

export function checksumAddress(addr: string): string {
  return getAddress(addr);
}
