import { ethers } from "ethers";
import { getChainId } from "./utils";
import { deployTestToken } from "./deployTestToken";
import { deployTestOracle, setTestOraclePrice } from "./deployTestOracle";
import { deployUnitroller } from "./deployComptroller";
import { deployInterestRate } from "./deployInterestRate";
import { deployLens } from "./deployLens";
import { deployCEther } from "./deployCEther";
import { deployMaximillion } from "./deployMaximillion";
import { addCTokenToMarket, deployCTokenAll } from "./deployCToken";
import { getMainAddresses } from "../script/deployAddresses";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { DeployReturn } from "./types";

export async function deployCore(deployer: Deployer, oracleAddress: string): Promise<DeployReturn> {
  const comptroller: ethers.Contract = await deployUnitroller(deployer, oracleAddress);

  const jumpRate: ethers.Contract = await deployInterestRate(deployer);

  await deployLens(deployer);

  const cEther: ethers.Contract = await deployCEther(
    deployer,
    comptroller,
    jumpRate
  );
  
  await deployMaximillion(deployer, cEther);

  const cTokens: ethers.Contract[] = await deployCTokenAll(deployer, comptroller, jumpRate);

  return { comptroller, cEther, cTokens };
}

export async function deployTestInterestRatePool(deployer: Deployer): Promise<void> {
  await deployTestToken(deployer);

  const priceOracle: ethers.Contract = await deployTestOracle(deployer);
  const oracleAddress: string = priceOracle.address;

  const { comptroller, cEther, cTokens }: DeployReturn = await deployCore(deployer, oracleAddress);

  // If price is zero, the comptroller will fail to set the collateral factor
  await setTestOraclePrice(priceOracle, cEther.address);
  await addCTokenToMarket(comptroller, cEther.address);

  await Promise.all(
    cTokens.map(
      async (cToken: ethers.Contract): Promise<void> => {
        await setTestOraclePrice(priceOracle, cToken.address);
        await addCTokenToMarket(comptroller, cToken.address);
      }
    )
  );
}

export async function deployInterestRatePool(deployer: Deployer): Promise<void> {
  const chainId: number = getChainId(deployer.hre);
  const oracleAddress: string = getMainAddresses()["oracle"][chainId];

  await deployCore(deployer, oracleAddress);
}
