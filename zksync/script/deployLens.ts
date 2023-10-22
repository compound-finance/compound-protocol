import { ethers } from "ethers";
import { getChainId } from "./utils";
import deployContract from "./deployContract";
import { recordMainAddress } from "./deployAddresses";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export async function deployLens(deployer: Deployer): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const lens = await deployContract(deployer, "CompoundLens", []);
  recordMainAddress(chainId, "zoroLens", lens.address);

  return lens;
}
