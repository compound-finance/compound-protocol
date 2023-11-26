import { ethers } from "ethers";
import { deployTestToken } from "./testToken";
import { deployTestOracle, setTestOraclePrice } from "./simpleOracle";
import { deployUnitroller } from "./comptroller";
import { deployInterestRatesAll } from "./interestRateModel";
import { deployLens } from "./lens";
import { deployMaximillion } from "./maximillion";
import { addCTokenToMarket, deployCTokenAll } from "./ctoken";
import { config } from "./config";
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
  const prefix = config.name === "core" ? "" : `${config.name}:`;

  const comptroller: ethers.Contract = await deployUnitroller(deployer, oracleAddress, config);
  deployer.hre.recordMainAddress(`${prefix}comptroller`, comptroller.address);

  const cTokens: CTokenCollection = await deployCTokenAll(deployer, comptroller, interestRates, config.markets);
  for (const [name, cToken] of Object.entries(cTokens)) {
    if (name === "eth") {
      const maximillion = await deployMaximillion(deployer, cToken);
      deployer.hre.recordMainAddress(`${prefix}maximillion`, maximillion.address);
    }
    deployer.hre.recordCTokenAddress(`${prefix}${name}`, cToken.address);
  }

  return { comptroller, cTokens };
}

export async function deployCore(deployer: Deployer, oracleAddress: string): Promise<DeployReturn[]> {
  const interestRates: InterestRateCollection = await deployInterestRatesAll(deployer);

  await deployLens(deployer);

  const poolDeployAll: DeployReturn[] = [];

  // Must complete txs sequentially for correct nonce
  for (const poolConfig of config.pools) {
    const poolDeploy: DeployReturn = await deployIsolatedPool(deployer, oracleAddress, interestRates, poolConfig);
    poolDeployAll.push(poolDeploy);
  }

  return poolDeployAll;
}

export async function deployTestInterestRatePool(deployer: Deployer): Promise<void> {
  await deployTestToken(deployer);

  const priceOracle: ethers.Contract = await deployTestOracle(deployer);
  const oracleAddress: string = priceOracle.address;

  const deployments: DeployReturn[] = await deployCore(deployer, oracleAddress);

  for (const i in deployments) {
    const { comptroller, cTokens }: DeployReturn = deployments[i];

    const markets: CTokenConfig[] = config.pools[i].markets;

    // Must complete txs sequentially for correct nonce
    for (const cTokenConfig of markets) {
      const { underlying }: CTokenConfig = cTokenConfig;

      // If price is zero, the comptroller will fail to set the collateral factor
      await setTestOraclePrice(priceOracle, cTokens[underlying].address);
      await addCTokenToMarket(comptroller, cTokens[underlying], cTokenConfig);
    }
  }
}

export async function deployInterestRatePool(deployer: Deployer): Promise<void> {
  const oracleAddress: string = deployer.hre.getMainAddress("oracle");

  await deployCore(deployer, oracleAddress);
}
