import { ethers } from "ethers";
import { getChainId } from "./utils";
import deployContract from "./contract";
import { recordMainAddress } from "./addresses";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { InterestRateArgs } from "./types";

export async function deployInterestRate(deployer: Deployer): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  // 5% base rate and 20% + 5% interest at kink and 200% multiplier starting at the kink of 90% utilization
  const baseRatePerYear: ethers.BigNumber = ethers.utils.parseEther("0.05");
  const multiplierPerYear: ethers.BigNumber = ethers.utils.parseEther("0.2");
  const jumpMultiplierPerYear: ethers.BigNumber = ethers.utils.parseEther("2");
  const kink: ethers.BigNumber = ethers.utils.parseEther("0.9");
  const owner: string = deployer.zkWallet.address;

  const interestRateArgs: InterestRateArgs = [
    baseRatePerYear,
    multiplierPerYear,
    jumpMultiplierPerYear,
    kink,
    owner
  ];

  const jumpRate: ethers.Contract = await deployContract(
    deployer,
    "JumpRateModelV2",
    interestRateArgs
  );

  recordMainAddress(chainId, "interest", jumpRate.address);

  return jumpRate;
}
