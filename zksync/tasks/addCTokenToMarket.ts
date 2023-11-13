import * as ethers from "ethers";
import { setTestOraclePrice } from "../script/simpleOracle";
import { addCTokenToMarket } from "../script/ctoken";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { task } from "hardhat/config";
import { Wallet } from "zksync-web3";
import { AddCTokenToMarketParams } from "../script/types";

export async function main(
  hre: HardhatRuntimeEnvironment,
  cToken: string
): Promise<void> {
  const wallet: Wallet = await hre.getZkWallet();

  const oracleAddress: string = hre.getMainAddress("oracle");
  const oracle: ethers.Contract = await hre.ethers.getContractAt(
    "SimplePriceOracle",
    oracleAddress,
    wallet
  );

  const cTokenAddress: string = hre.getCTokenAddress(cToken);

  console.log("Configuring Price Oracle...");
  await setTestOraclePrice(oracle, cTokenAddress);

  const comptrollerAddress: string = hre.getMainAddress("oracle");
  const comptroller: ethers.Contract = await hre.ethers.getContractAt(
    "Comptroller",
    comptrollerAddress,
    wallet
  );

  console.log("Supporting with Comptroller...");
  await addCTokenToMarket(comptroller, cTokenAddress);
}

task(
  "addCTokenToMarket",
  "Add a ZToken to the market and set it's oracle price"
)
  .addPositionalParam("cToken", "CToken name from zTokens.json, e.g. wbtc")
  .setAction(
    async (
      { cToken }: AddCTokenToMarketParams,
      hre: HardhatRuntimeEnvironment
    ): Promise<void> => {
      console.log("Adding CToken to market...");

      await main(hre, cToken);
    }
  );
