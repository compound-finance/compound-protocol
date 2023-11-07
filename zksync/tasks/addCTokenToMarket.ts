import * as ethers from "ethers";
import { configurePriceOracle, addCTokenToMarket } from "../script/deployCore";
import {
  getMainAddresses,
  getCTokenAddresses
} from "../script/deployAddresses";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { task } from "hardhat/config";
import { getChainId } from "../script/utils";
import { Wallet } from "zksync-web3";
import { AddCTokenToMarketParams, AddressConfig } from "../script/types";

export async function main(
  hre: HardhatRuntimeEnvironment,
  cToken: string
): Promise<void> {
  const wallet: Wallet = await hre.getZkWallet();

  const addresses: AddressConfig = getMainAddresses();
  const chainId: number = getChainId(hre);

  const oracleAddress: string = addresses["oracle"][chainId];
  const oracle: ethers.Contract = await hre.ethers.getContractAt(
    "SimplePriceOracle",
    oracleAddress,
    wallet
  );

  const cTokens: AddressConfig = getCTokenAddresses();
  const cTokenAddress: string = cTokens[cToken][chainId];

  console.log("Configuring Price Oracle...");
  await configurePriceOracle(oracle, cTokenAddress);

  const comptrollerAddress: string = addresses["comptroller"][chainId];
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
