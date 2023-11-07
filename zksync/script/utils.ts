import { HardhatRuntimeEnvironment } from "hardhat/types";

export function getChainId(hre: HardhatRuntimeEnvironment): number {
  const chainId: number | undefined = hre.network.config.chainId;

  if (typeof chainId === "undefined") {
    throw new Error("Chain ID is not defined");
  }

  return chainId;
}
