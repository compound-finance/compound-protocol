import * as ethers from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import {
  getMainAddresses,
  getUnderlyingTokens,
  recordCTokenAddress
} from "../script/addresses";
import { deployCToken } from "../script/ctoken";
import { getChainId } from "../script/utils";
import { Wallet } from "zksync-web3";
import { AddressConfig, DeployCTokenParams } from "../script/types";

async function main(
  hre: HardhatRuntimeEnvironment,
  underlying: string,
  exchangeRateDecimals: number
): Promise<void> {
  const wallet: Wallet = await hre.getZkWallet();

  const deployer: Deployer = new Deployer(hre, wallet);

  const addresses: AddressConfig = getMainAddresses();

  const chainId: number = getChainId(deployer.hre);

  const comptrollerAddress: string = addresses["comptroller"][chainId];
  const interestRateModel: string = addresses["interest"][chainId];

  const underlyingTokens: AddressConfig = getUnderlyingTokens();
  const underlyingAddr: string = underlyingTokens[underlying][chainId];

  const cToken: ethers.Contract = await deployCToken(
    deployer,
    underlyingAddr,
    comptrollerAddress,
    interestRateModel,
    exchangeRateDecimals
  );

  recordCTokenAddress(chainId, underlying, cToken.address);
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
