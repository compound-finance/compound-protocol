import { ethers } from "ethers";
import deployContract from "./contract";
import { config } from "./config";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import {
  ContractEntry,
  InterestRateArgs,
  InterestRateCollection,
  InterestRateConfig
} from "./types";

export async function deployInterestRate(deployer: Deployer, config: InterestRateConfig): Promise<[string, ethers.Contract]> {
  const { name, baseRatePerYear, multiplierPerYear, jumpMultiplierPerYear, kink } = config;

  const owner: string = deployer.zkWallet.address;

  const interestRateArgs: InterestRateArgs = [
    ethers.utils.parseEther(baseRatePerYear),
    ethers.utils.parseEther(multiplierPerYear),
    ethers.utils.parseEther(jumpMultiplierPerYear),
    ethers.utils.parseEther(kink),
    owner
  ];

  const jumpRate: ethers.Contract = await deployContract(
    deployer,
    "JumpRateModelV2",
    interestRateArgs
  );

  deployer.hre.recordMainAddress("interest", jumpRate.address);

  return [name, jumpRate];
}

export async function deployInterestRatesAll(deployer: Deployer): Promise<InterestRateCollection> {
  const interestRateDeploys: Promise<ContractEntry>[] = config.interestRateModels.map(deployInterestRate.bind(null, deployer));

  const interestRateEntries: ContractEntry[] = await Promise.all(interestRateDeploys);
  const interestRates: InterestRateCollection = Object.fromEntries(interestRateEntries);

  return interestRates;
}
