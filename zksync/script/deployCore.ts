import * as ethers from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import deployContract from "./deployContract";
import { recordMainAddress } from "./deployAddresses";

export async function deployOracle(deployer: Deployer) {
  const chainId = deployer.hre.network.config.chainId;

  const priceOracle = await deployContract(deployer, "SimplePriceOracle", []);
  recordMainAddress(chainId, "oracle", priceOracle.address);

  return priceOracle;
}

export async function deployUnitroller(
  deployer: Deployer,
  priceOracle: ethers.Contract
) {
  const chainId = deployer.hre.network.config.chainId;

  const unitroller = await deployContract(deployer, "Unitroller", []);

  recordMainAddress(chainId, "comptroller", unitroller.address);

  await upgradeComptroller(deployer, unitroller);

  const comptroller = await deployer.hre.ethers.getContractAt(
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
) {
  const chainId = deployer.hre.network.config.chainId;

  const comptroller = await deployContract(deployer, "Comptroller", []);
  recordMainAddress(chainId, "comptroller-impl", comptroller.address);

  const setImplTx = await unitroller._setPendingImplementation(
    comptroller.address
  );
  await setImplTx.wait();
  const acceptImplTx = await comptroller._become(unitroller.address);
  await acceptImplTx.wait();

  return comptroller;
}

export async function deployInterestRate(deployer: Deployer) {
  const chainId = deployer.hre.network.config.chainId;

  // 5% base rate and 20% + 5% interest at kink and 200% multiplier starting at the kink of 90% utilization
  const baseRatePerYear: BigNumber = ethers.utils.parseEther("0.05");
  const multiplierPerYear: BigNumber = ethers.utils.parseEther("0.2");
  const jumpMultiplierPerYear: BigNumber = ethers.utils.parseEther("2");
  const kink: BigNumber = ethers.utils.parseEther("0.9");
  const owner: string = deployer.zkWallet.address;

  const interestRateArgs: Array = [
    baseRatePerYear,
    multiplierPerYear,
    jumpMultiplierPerYear,
    kink,
    owner
  ];

  const jumpRate = await deployContract(
    deployer,
    "JumpRateModelV2",
    interestRateArgs
  );

  recordMainAddress(chainId, "interest", jumpRate.address);

  return jumpRate;
}

export async function deployLens(deployer: Deployer) {
  const chainId = deployer.hre.network.config.chainId;

  const lens = await deployContract(deployer, "CompoundLens", []);
  recordMainAddress(chainId, "zoroLens", lens.address);

  return lens;
}

export async function deployMaximillion(
  deployer: Deployer,
  cether: ethers.Contract
) {
  const chainId = deployer.hre.network.config.chainId;

  const maxi = await deployContract(deployer, "Maximillion", [cether.address]);
  recordMainAddress(chainId, "maximillion", maxi.address);

  return maxi;
}

export async function deployMulticall(deployer: Deployer) {
  const chainId = deployer.hre.network.config.chainId;

  const multicall = await deployContract(deployer, "Multicall3", []);
  recordMainAddress(chainId, "multicall", multicall.address);

  return multicall;
}

export async function configureComptroller(
  comptroller: Contract,
  priceOracleAddress: string
) {
  const oracleTx = await comptroller._setPriceOracle(priceOracleAddress);
  await oracleTx.wait();

  const closeFactor = ethers.utils.parseEther("0.5");
  const closeFactorTx = await comptroller._setCloseFactor(closeFactor);
  await closeFactorTx.wait();

  const liquidationIncentive = ethers.utils.parseEther("1.1");
  const incentiveTx = await comptroller._setLiquidationIncentive(
    liquidationIncentive
  );
  await incentiveTx.wait();
}

export async function configurePriceOracle(
  priceOracle: Contract,
  ctokenAddress: string
) {
  const price = ethers.utils.parseEther("1");
  const setPriceTx = await priceOracle.setUnderlyingPrice(ctokenAddress, price);
  await setPriceTx.wait();
}

export async function addCTokenToMarket(
  comptroller: Contract,
  ctokenAddress: string
) {
  const addMarketTx = await comptroller._supportMarket(ctokenAddress);
  await addMarketTx.wait();

  // If the ctoken isn't a supported market, it will fail to set the collateral factor
  const collateralFactor: BigNumber = ethers.utils.parseEther("0.5");
  const collateralTx = await comptroller._setCollateralFactor(
    ctokenAddress,
    collateralFactor
  );
  await collateralTx.wait();
}
