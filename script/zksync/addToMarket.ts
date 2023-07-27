import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Wallet } from "zksync-web3";
import {
  configurePriceOracle,
  addCTokenToMarket
} from "./deployCore";
import { getMainAddresses } from "./deployAddresses";

export async function main(
  hre: HardhatRuntimeEnvironment,
  wallet: Wallet,
  cTokenAddress: string
) {
  const addresses = getMainAddresses();
  const chainId = hre.network.config.chainId;

  const oracleAddress = addresses["oracle"][chainId];
  const oracle = await hre.ethers.getContractAt(
    "SimplePriceOracle",
    oracleAddress,
    wallet
  );

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
  .addPositionalParam("cTokenAddress")
  .setAction(async ({ cTokenAddress }, hre) => {
    console.log("Adding ZToken to market...");

    const wallet = await hre.getWallet();

    await main(hre, wallet, cTokenAddress);
  });
