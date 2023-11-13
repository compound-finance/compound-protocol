import { ethers } from "ethers";
import { getChainId } from "./utils";
import deployContract from "./contract";
import { recordMainAddress } from "./addresses";
import { config } from "../deploy/config";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { TransactionResponse } from "ethers/providers";
import { PoolConfig } from "./types";

export async function deployUnitroller(
  deployer: Deployer,
  oracleAddress: string,
  config: PoolConfig
): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const unitroller: ethers.Contract = await deployContract(
    deployer,
    "Unitroller",
    []
  );

  recordMainAddress(chainId, "comptroller", unitroller.address);

  await upgradeComptroller(deployer, unitroller);

  const comptroller: ethers.Contract = await deployer.hre.ethers.getContractAt(
    "Comptroller",
    unitroller.address,
    deployer.zkWallet
  );

  const { closeFactor, liquidationIncentive }: PoolConfig = config;
  await configureComptroller(comptroller, oracleAddress, closeFactor, liquidationIncentive);

  return comptroller;
}

export async function upgradeComptroller(
  deployer: Deployer,
  unitroller: ethers.Contract
): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const comptroller: ethers.Contract = await deployContract(
    deployer,
    "Comptroller",
    []
  );
  recordMainAddress(chainId, "comptroller-impl", comptroller.address);

  const setImplTx: TransactionResponse = await unitroller._setPendingImplementation(
    comptroller.address
  );
  await setImplTx.wait();

  const acceptImplTx = await comptroller._become(unitroller.address);
  await acceptImplTx.wait();

  return comptroller;
}

export async function configureComptroller(
  comptroller: ethers.Contract,
  priceOracleAddress: string,
  closeFactor: string,
  liquidationIncentive: string
): Promise<void> {
  const oracleTx: TransactionResponse = await comptroller._setPriceOracle(priceOracleAddress);
  await oracleTx.wait();

  const closeFactorMantissa: ethers.BigNumber = ethers.utils.parseEther(closeFactor);
  const closeFactorTx: TransactionResponse = await comptroller._setCloseFactor(closeFactorMantissa);
  await closeFactorTx.wait();

  const liquidationIncentiveMantissa: ethers.BigNumber = ethers.utils.parseEther(liquidationIncentive);
  const incentiveTx: TransactionResponse = await comptroller._setLiquidationIncentive(
    liquidationIncentiveMantissa
  );
  await incentiveTx.wait();
}

export async function deployUnitrollersAll(
  deployer: Deployer,
  oracleAddress: string
): Promise<ethers.Contract[]> {
  const comptrollerDeploys: Promise<ethers.Contract>[] = config.pools.map(deployUnitroller.bind(null, deployer, oracleAddress));
  const comptrollers: ethers.Contract[] = await Promise.all(comptrollerDeploys);

  return comptrollers;
}
