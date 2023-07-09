import hre from "hardhat";
const utils = hre.ethers.utils;

function logBalance(symbol:string, balance:hre.ethers.BigNumber) {
  console.log(`Wallet balance (${symbol}): ${utils.formatEther(balance)}`);
}

async function main() {
  console.log(`Running test script for Zoro Protocol on zkSync`);

  const wallet = hre.zkWallet;

  const testUsdAddress = "0xd4567AA4Fd1B32A16c16CBFF9D9a69e51CF72293";
  const testUsd = await hre.ethers.getContractAt(
    "contracts/test/ERC20.sol:StandardToken",
    testUsdAddress,
    wallet
  );

  const testUsdBalance = await testUsd.balanceOf(wallet.address);
  logBalance("TEST", testUsdBalance);

  const ctUsdAddress = "0xcFDE18a0f130bBAfe0037072407F83899D49414f";
  const ctUsd = await hre.ethers.getContractAt(
    "CErc20Immutable",
    ctUsdAddress,
    wallet
  );

  const priceOracleAddress = "0x1F0151386fB0AbBF0273238dF5E9bc519DE5e20B";
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

  const comptrollerAddress = "0x5B11c36bf87ED2EAc102C42E9528eC99D77f7aFd";
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

  logBalance("TEST", testUsdBalance);

  const interestRateModelAddress = "0x29c6fF2E3D04a9f37e7af1fF9b38C9E2e9079FfA";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
