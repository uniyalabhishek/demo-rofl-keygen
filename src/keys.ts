import { Wallet, getAddress } from "ethers";

export function secretKeyToWallet(skHex: string): Wallet {
  return new Wallet(skHex);
}

export function checksumAddress(addr: string): string {
  return getAddress(addr);
}
