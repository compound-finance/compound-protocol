import { ethers } from "ethers";
import { getChainId } from "./utils";
import deployContract from "./contract";
import { recordMainAddress } from "./addresses";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export async function deployMaximillion(
  deployer: Deployer,
  cether: ethers.Contract
): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const maxi: ethers.Contract = await deployContract(deployer, "Maximillion", [cether.address]);
  recordMainAddress(chainId, "maximillion", maxi.address);

  return maxi;
}
