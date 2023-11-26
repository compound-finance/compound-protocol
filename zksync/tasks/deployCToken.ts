import * as ethers from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { deployCToken } from "../script/ctoken";
import { config } from "../script/config";
import { getCTokenConfig } from "../script/utils";
import { Wallet } from "zksync-web3";
import { CTokenConfig, DeployConfig, DeployCTokenParams } from "../script/types";

async function main(
  hre: HardhatRuntimeEnvironment,
  pool: string,
  cTokenKey: string,
  config: DeployConfig
): Promise<void> {
  const wallet: Wallet = await hre.getZkWallet();

  const deployer: Deployer = new Deployer(hre, wallet);

  const comptrollerAddress: string = hre.getMainAddress("comptroller");


  const cTokenConfig: CTokenConfig = getCTokenConfig(config, pool, cTokenKey);
  const interestRateKey: string = `interest:${cTokenConfig.interestRateModel}`;
  const interestRateAddress: string = hre.getMainAddress(interestRateKey);

  const cToken: ethers.Contract = await deployCToken(
    deployer,
    comptrollerAddress,
    cTokenConfig.underlying,
    interestRateAddress
  );

  hre.recordCTokenAddress(cTokenConfig.underlying, cToken.address);
}

task("deployCToken", "Deploy a new CToken")
.addOptionalParam("pool", "Isolated pool name from config.ts, e.g. degen", "core")
.addPositionalParam("cToken", "CToken name from zTokens.json, e.g. wbtc")
.setAction(
  async (
    { pool, cToken }: DeployCTokenParams,
    hre: HardhatRuntimeEnvironment
  ) => {
    console.log("Deploying a new ZToken...");

    await main(hre, pool, cToken, config);
  }
);
