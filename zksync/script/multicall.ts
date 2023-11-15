import { ethers } from "ethers";
import deployContract from "./contract";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export async function deployMulticall(deployer: Deployer): Promise<ethers.Contract> {
  const multicall: ethers.Contract = await deployContract(deployer, "Multicall3", []);
  deployer.hre.recordMainAddress("multicall", multicall.address);

  return multicall;
}
