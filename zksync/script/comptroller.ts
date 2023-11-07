import { ethers } from "ethers";
import { getChainId } from "./utils";
import deployContract from "./contract";
import { recordMainAddress } from "./addresses";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { TransactionResponse } from "ethers/providers";

export async function deployUnitroller(
  deployer: Deployer,
  oracleAddress: string
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

  await configureComptroller(comptroller, oracleAddress);

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
  priceOracleAddress: string
): Promise<void> {
  const oracleTx: TransactionResponse = await comptroller._setPriceOracle(priceOracleAddress);
  await oracleTx.wait();

  const closeFactor: ethers.BigNumber = ethers.utils.parseEther("0.5");
  const closeFactorTx: TransactionResponse = await comptroller._setCloseFactor(closeFactor);
  await closeFactorTx.wait();

  const liquidationIncentive: ethers.BigNumber = ethers.utils.parseEther("1.1");
  const incentiveTx: TransactionResponse = await comptroller._setLiquidationIncentive(
    liquidationIncentive
  );
  await incentiveTx.wait();
}
