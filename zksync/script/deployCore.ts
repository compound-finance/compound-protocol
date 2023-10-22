import * as ethers from "ethers";
import { TransactionResponse } from "ethers/providers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import deployContract from "./deployContract";
import { recordMainAddress } from "./deployAddresses";
import { getChainId } from "./utils";
import { InterestRateArgs } from "./types";

export async function deployOracle(
  deployer: Deployer
): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const priceOracle: ethers.Contract = await deployContract(
    deployer,
    "SimplePriceOracle",
    []
  );
  recordMainAddress(chainId, "oracle", priceOracle.address);

  return priceOracle;
}

export async function deployUnitroller(
  deployer: Deployer,
  priceOracle: ethers.Contract
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

  await configureComptroller(comptroller, priceOracle.address);

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

export async function deployInterestRate(deployer: Deployer): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  // 5% base rate and 20% + 5% interest at kink and 200% multiplier starting at the kink of 90% utilization
  const baseRatePerYear: ethers.BigNumber = ethers.utils.parseEther("0.05");
  const multiplierPerYear: ethers.BigNumber = ethers.utils.parseEther("0.2");
  const jumpMultiplierPerYear: ethers.BigNumber = ethers.utils.parseEther("2");
  const kink: ethers.BigNumber = ethers.utils.parseEther("0.9");
  const owner: string = deployer.zkWallet.address;

  const interestRateArgs: InterestRateArgs = [
    baseRatePerYear,
    multiplierPerYear,
    jumpMultiplierPerYear,
    kink,
    owner
  ];

  const jumpRate: ethers.Contract = await deployContract(
    deployer,
    "JumpRateModelV2",
    interestRateArgs
  );

  recordMainAddress(chainId, "interest", jumpRate.address);

  return jumpRate;
}

export async function deployLens(deployer: Deployer): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const lens = await deployContract(deployer, "CompoundLens", []);
  recordMainAddress(chainId, "zoroLens", lens.address);

  return lens;
}

export async function deployMaximillion(
  deployer: Deployer,
  cether: ethers.Contract
): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const maxi: ethers.Contract = await deployContract(deployer, "Maximillion", [cether.address]);
  recordMainAddress(chainId, "maximillion", maxi.address);

  return maxi;
}

export async function deployMulticall(deployer: Deployer): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const multicall: ethers.Contract = await deployContract(deployer, "Multicall3", []);
  recordMainAddress(chainId, "multicall", multicall.address);

  return multicall;
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

export async function configurePriceOracle(
  priceOracle: ethers.Contract,
  ctokenAddress: string
): Promise<void> {
  const price: ethers.BigNumber = ethers.utils.parseEther("1");
  const setPriceTx: TransactionResponse = await priceOracle.setUnderlyingPrice(ctokenAddress, price);
  await setPriceTx.wait();
}

export async function addCTokenToMarket(
  comptroller: ethers.Contract,
  ctokenAddress: string
) {
  const addMarketTx: TransactionResponse = await comptroller._supportMarket(ctokenAddress);
  await addMarketTx.wait();

  // If the ctoken isn't a supported market, it will fail to set the collateral factor
  const collateralFactor: ethers.BigNumber = ethers.utils.parseEther("0.5");
  const collateralTx: TransactionResponse = await comptroller._setCollateralFactor(
    ctokenAddress,
    collateralFactor
  );
  await collateralTx.wait();
}
