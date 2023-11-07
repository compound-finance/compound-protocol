import * as ethers from "ethers";
import { deprecateCToken } from "../script/ctoken";
import {
  getMainAddresses,
  getCTokenAddresses
} from "../script/addresses";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { task } from "hardhat/config";
import { getChainId } from "../script/utils";
import { Wallet } from "zksync-web3";
import { DeprecateCTokenParams, AddressConfig } from "../script/types";

export async function main(
  hre: HardhatRuntimeEnvironment,
  cTokenKey: string
): Promise<void> {
  const wallet: Wallet = await hre.getZkWallet();

  const addresses: AddressConfig = getMainAddresses();
  const chainId: number = getChainId(hre);

  const cTokens: AddressConfig = getCTokenAddresses();
  const cTokenAddress: string = cTokens[cTokenKey][chainId];
  const cToken: ethers.Contract = await hre.ethers.getContractAt(
    "CToken",
    cTokenAddress,
    wallet
  );

  const comptrollerAddress: string = addresses["comptroller"][chainId];
  const comptroller: ethers.Contract = await hre.ethers.getContractAt(
    "Comptroller",
    comptrollerAddress,
    wallet
  );

  const isDeprecated: boolean = await comptroller.isDeprecated(cTokenAddress);

  if (isDeprecated) {
    console.log("CToken is already deprecated, exiting...");
  } else {
    await deprecateCToken(comptroller, cToken);
    console.log("Deprecation completed");
  }
}

task(
  "deprecateCToken",
  "Deprecate a CToken so it can no longer be used and is excluded from the pool"
)
  .addPositionalParam("cToken", "CToken name from zTokens.json, e.g. wbtc")
  .setAction(
    async (
      { cToken }: DeprecateCTokenParams,
      hre: HardhatRuntimeEnvironment
    ): Promise<void> => {
      console.log("Deprecating CToken and removing from the pool...");

      await main(hre, cToken);
    }
  );

