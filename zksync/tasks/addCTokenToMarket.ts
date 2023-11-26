import * as ethers from "ethers";
import { setTestOraclePrice } from "../script/simpleOracle";
import { addCTokenToMarket } from "../script/ctoken";
import { config } from "../script/config";
import { getCTokenConfig } from "../script/utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { task } from "hardhat/config";
import { Wallet } from "zksync-web3";
import { AddCTokenToMarketParams, CTokenConfig, DeployConfig } from "../script/types";

export async function main(
  hre: HardhatRuntimeEnvironment,
  pool: string,
  cTokenKey: string,
  config: DeployConfig
): Promise<void> {
  const wallet: Wallet = await hre.getZkWallet();

  const oracleAddress: string = hre.getMainAddress("oracle");
  const oracle: ethers.Contract = await hre.ethers.getContractAt(
    "SimplePriceOracle",
    oracleAddress,
    wallet
  );

  const cTokenAddress: string = hre.getCTokenAddress(cTokenKey);
  const cToken: ethers.Contract = await hre.ethers.getContractAt(
    "CToken",
    cTokenAddress,
    wallet
  );

  console.log("Configuring Price Oracle...");
  await setTestOraclePrice(oracle, cTokenAddress);

  const comptrollerAddress: string = hre.getMainAddress("comptroller");
  const comptroller: ethers.Contract = await hre.ethers.getContractAt(
    "Comptroller",
    comptrollerAddress,
    wallet
  );

  const cTokenConfig: CTokenConfig = getCTokenConfig(config, pool, cTokenKey);

  console.log("Supporting with Comptroller...");
  await addCTokenToMarket(comptroller, cToken, cTokenConfig);
}

task(
  "addCTokenToMarket",
  "Add a ZToken to the market and set it's oracle price"
)
  .addOptionalParam("pool", "Isolated pool name from config.ts, e.g. degen", "core")
  .addPositionalParam("cToken", "CToken name from zTokens.json, e.g. wbtc")
  .setAction(
    async (
      { pool, cToken }: AddCTokenToMarketParams,
      hre: HardhatRuntimeEnvironment
    ): Promise<void> => {
      console.log("Adding CToken to market...");

      await main(hre, pool, cToken, config);
    }
  );
