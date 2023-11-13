import * as ethers from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { deployCToken } from "../script/ctoken";
import { Wallet } from "zksync-web3";
import { DeployCTokenParams } from "../script/types";

async function main(
  hre: HardhatRuntimeEnvironment,
  underlying: string,
  exchangeRateDecimals: number
): Promise<void> {
  const wallet: Wallet = await hre.getZkWallet();

  const deployer: Deployer = new Deployer(hre, wallet);

  const comptrollerAddress: string = hre.getMainAddress("comptroller");
  const interestRateModel: string = hre.getMainAddress("interest");

  const underlyingAddr: string = hre.getUnderlyingToken(underlying);

  const cToken: ethers.Contract = await deployCToken(
    deployer,
    underlyingAddr,
    comptrollerAddress,
    interestRateModel,
    exchangeRateDecimals
  );

  hre.recordCTokenAddress(underlying, cToken.address);
}

task("deployCToken", "Deploy a new CToken")
.addPositionalParam("underlying", "Token name from tokens.json, e.g. wbtc")
.addPositionalParam(
  "exchangeRateDecimals",
  "Price decimals (18) - CToken decimals (8) + underlying decimals"
)
.setAction(
  async (
    { underlying, exchangeRateDecimals }: DeployCTokenParams,
    hre: HardhatRuntimeEnvironment
  ) => {
    console.log("Deploying a new ZToken...");

    await main(hre, underlying, exchangeRateDecimals);
  }
);
