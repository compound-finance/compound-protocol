import { ethers } from "ethers";
import { getChainId } from "./utils";
import { deployTestToken } from "./testToken";
import { deployTestOracle, setTestOraclePrice } from "./simpleOracle";
import { deployUnitroller } from "./comptroller";
import { deployInterestRatesAll } from "./interestRateModel";
import { deployLens } from "./lens";
import { deployCEther } from "./cether";
import { deployMaximillion } from "./maximillion";
import { addCTokenToMarket, deployCTokenAll } from "./ctoken";
import { getMainAddresses } from "../script/addresses";
import { config } from "../deploy/config";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import {
  DeployReturn,
  CTokenCollection,
  CTokenConfig,
  InterestRateCollection,
  PoolConfig
} from "./types";

async function deployIsolatedPool(
  deployer: Deployer,
  oracleAddress: string,
  interestRates: InterestRateCollection,
  config: PoolConfig
): Promise<DeployReturn> {
  const comptroller: ethers.Contract = await deployUnitroller(deployer, oracleAddress, config);

  const cEther: ethers.Contract = await deployCEther(
    deployer,
    comptroller,
    interestRates["eth"]
  );

  await deployMaximillion(deployer, cEther);

  const cTokens: CTokenCollection = await deployCTokenAll(deployer, comptroller, interestRates, config.markets);

  return { comptroller, cEther, cTokens };
}

export async function deployCore(deployer: Deployer, oracleAddress: string): Promise<DeployReturn[]> {
  const interestRates: InterestRateCollection = await deployInterestRatesAll(deployer);

  await deployLens(deployer);

  const poolDeploys: Promise<DeployReturn>[] = config.pools.map(deployIsolatedPool.bind(null,deployer, oracleAddress, interestRates));
  const pools: DeployReturn[] = await Promise.all(poolDeploys);

  return pools;
}

export async function deployTestInterestRatePool(deployer: Deployer): Promise<void> {
  await deployTestToken(deployer);

  const priceOracle: ethers.Contract = await deployTestOracle(deployer);
  const oracleAddress: string = priceOracle.address;

  const deployments: DeployReturn[] = await deployCore(deployer, oracleAddress);

  for (const i in deployments) {
    const { comptroller, cEther, cTokens } = deployments[i];

    const markets: CTokenConfig[] = config.pools[i].markets;

    // Must complete txs sequentially for correct nonce
    for (const cTokenConfig of markets) {
      const { underlying } = cTokenConfig;

      // If price is zero, the comptroller will fail to set the collateral factor
      if (underlying === "eth") {
        await setTestOraclePrice(priceOracle, cEther.address);
        await addCTokenToMarket(comptroller, cEther, cTokenConfig);
      } else {
        await setTestOraclePrice(priceOracle, cTokens[underlying].address);
        await addCTokenToMarket(comptroller, cTokens[underlying], cTokenConfig);
      }
    }
  }
}

export async function deployInterestRatePool(deployer: Deployer): Promise<void> {
  const chainId: number = getChainId(deployer.hre);
  const oracleAddress: string = getMainAddresses()["oracle"][chainId];

  await deployCore(deployer, oracleAddress);
}
