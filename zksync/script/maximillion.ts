import { ethers } from "ethers";
import deployContract from "./contract";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export async function deployMaximillion(
  deployer: Deployer,
  cether: ethers.Contract
): Promise<ethers.Contract> {
  const maxi: ethers.Contract = await deployContract(deployer, "Maximillion", [cether.address]);
  return maxi;
}
