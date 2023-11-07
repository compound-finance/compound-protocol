import { ethers } from "ethers";
import { getChainId } from "./utils";
import deployContract from "./contract";
import { recordMainAddress } from "./addresses";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export async function deployLens(deployer: Deployer): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const lens = await deployContract(deployer, "CompoundLens", []);
  recordMainAddress(chainId, "zoroLens", lens.address);

  return lens;
}
