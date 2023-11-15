import { ethers } from "ethers";
import deployContract from "./contract";
import { config } from "./config";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import {
  InterestRateArgs,
  InterestRateCollection,
  InterestRateConfig
} from "./types";

export async function deployInterestRate(deployer: Deployer, config: InterestRateConfig): Promise<ethers.Contract> {
  const { baseRatePerYear, multiplierPerYear, jumpMultiplierPerYear, kink } = config;

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

  return jumpRate;
}

export async function deployInterestRatesAll(deployer: Deployer): Promise<InterestRateCollection> {
  const interestRates: InterestRateCollection = {};

  // Must complete txs sequentially for correct nonce
  for (const interestRateConfig of config.interestRateModels) {
    const interestRate: ethers.Contract = await deployInterestRate(deployer, interestRateConfig);

    const { name } = interestRateConfig;
    interestRates[name] = interestRate;

    deployer.hre.recordMainAddress(`interest:${name}`, interestRate.address);
  }

  return interestRates;
}
