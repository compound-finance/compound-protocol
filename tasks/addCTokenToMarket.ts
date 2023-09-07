import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Wallet } from "zksync-web3";
import {
  configurePriceOracle,
  addCTokenToMarket
} from "../script/zksync/deployCore";
import {
  getMainAddresses,
  getCTokenAddresses
} from "../script/zksync/deployAddresses";

export async function main(hre: HardhatRuntimeEnvironment, cToken: string) {
  const wallet = await hre.getWallet();

  const addresses = getMainAddresses();
  const chainId = hre.network.config.chainId;

  const oracleAddress = addresses["oracle"][chainId];
  const oracle = await hre.ethers.getContractAt(
    "SimplePriceOracle",
    oracleAddress,
    wallet
  );

  const cTokens = getCTokenAddresses();
  const cTokenAddress = cTokens[cToken][chainId];

  console.log("Configuring Price Oracle...");
  await configurePriceOracle(oracle, cTokenAddress);

  const comptrollerAddress = addresses["comptroller"][chainId];
  const comptroller = await hre.ethers.getContractAt(
    "Comptroller",
    comptrollerAddress,
    wallet
  );

  console.log("Supporting with Comptroller...");
  await addCTokenToMarket(comptroller, cTokenAddress);
}

task("addCTokenToMarket", "Add a ZToken to the market and set it's oracle price")
  .addPositionalParam("cToken", "CToken name from zTokens.json, e.g. wbtc")
  .setAction(async ({ cToken }, hre) => {
    console.log("Adding CToken to market...");

    await main(hre, cToken);
  });
