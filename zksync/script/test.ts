import hre from "hardhat";
const utils = hre.ethers.utils;

import mainAddresses from "../../deploy/main.json";
import tokenAddresses from "../../deploy/tokens.json";
import ctokenAddresses from "../../deploy/zTokens.json";

function logBalance(symbol:string, balance:hre.ethers.BigNumber) {
  console.log(`Wallet balance (${symbol}): ${utils.formatEther(balance)}`);
}

async function main() {
  console.log(`Running test script for Zoro Protocol on zkSync`);

  const chainId = hre.network.config.chainId;

  const wallet = hre.zkWallet;

  const testUsdAddress = tokenAddresses["test"][chainId];
  const testUsd = await hre.ethers.getContractAt(
    "contracts/test/ERC20.sol:StandardToken",
    testUsdAddress,
    wallet
  );

  const testUsdBalance = await testUsd.balanceOf(wallet.address);
  logBalance("TEST", testUsdBalance);

  const ctUsdAddress = ctokenAddresses["test"][chainId];
  const ctUsd = await hre.ethers.getContractAt(
    "CErc20Immutable",
    ctUsdAddress,
    wallet
  );

  const priceOracleAddress = mainAddresses["oracle"][chainId];
  const priceOracle = await hre.ethers.getContractAt("SimplePriceOracle", priceOracleAddress, wallet);

  const price = utils.parseEther("1");
  console.log(`Setting price oracle to ${utils.formatEther(price)}...`);
  const setPriceTx = await priceOracle.setUnderlyingPrice(ctUsd.address, price);
  await setPriceTx.wait();

  const mintAmount = utils.parseEther("1");

  console.log(`Approving ${utils.formatEther(mintAmount)} TEST...`);
  const approveTx = await testUsd.approve(ctUsd.address, mintAmount);
  await approveTx.wait();

  console.log(`Minting ${utils.formatEther(mintAmount)} zTEST...`);
  const mintTx = await ctUsd.mint(mintAmount);
  await mintTx.wait()

  const ctUsdBalance = await ctUsd.balanceOf(wallet.address);
  logBalance("zTEST", ctUsdBalance);

  const comptrollerAddress = mainAddresses["comptroller"][chainId];
  const comptroller = await hre.ethers.getContractAt("Comptroller", comptrollerAddress, wallet);

  const ctokens = {
      "zTEST": ctUsd.address,
  };

  console.log(`Entering the ${Object.keys(ctokens).join(", ")} markets...`);
  const marketTx = await comptroller.enterMarkets(Object.values(ctokens));
  await marketTx.wait();

  const collateralFactor:BigNumber = utils.parseEther("0.5");

  console.log(`Setting collateral factor to ${utils.formatEther(collateralFactor)}...`);
  const collateralTx = await comptroller._setCollateralFactor(ctUsd.address, collateralFactor);
  await collateralTx.wait();

  const { isListed, collateralFactorMantissa, isComped } = await comptroller.markets(ctUsd.address);
  console.log(`TEST market is ${isListed ? "" : "not"} listed with a collateral factor of ${utils.formatEther(collateralFactorMantissa)}`);

  const accountLiquidity = await comptroller.getAccountLiquidity(wallet.address);
  console.log(`Account liquidity: ${accountLiquidity.toString()}`);

  const borrowAmount = utils.parseEther("0.25");

  console.log(`Borrowing ${utils.formatEther(borrowAmount)} TEST...`);
  const borrowTx = await ctUsd.borrow(borrowAmount);
  await borrowTx.wait();

  const newTestUsdBalance = await testUsd.balanceOf(wallet.address);
  logBalance("TEST", newTestUsdBalance);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
