import { ethers } from "ethers";
import deployContract from "./contract";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export async function deployLens(deployer: Deployer): Promise<ethers.Contract> {
  const lens = await deployContract(deployer, "CompoundLens", [], false);
  deployer.hre.recordMainAddress("zoroLens", lens.address);

  return lens;
}
