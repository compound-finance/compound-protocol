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

  const mintAmount = utils.parseEther("1");

  console.log(`Approving ${utils.formatEther(mintAmount)} TEST...`);
  await testUsd.approve(ctUsd.address, mintAmount);

  console.log(`Minting ${utils.formatEther(mintAmount)} zTEST...`);
  await ctUsd.mint(mintAmount);

  const ctUsdBalance = await ctUsd.balanceOf(wallet.address);
  logBalance("zTEST", ctUsdBalance);

  const comptrollerAddress = "0x5B11c36bf87ED2EAc102C42E9528eC99D77f7aFd";
  const interestRateModelAddress = "0x29c6fF2E3D04a9f37e7af1fF9b38C9E2e9079FfA";
  const priceOracleAddress = "0x1F0151386fB0AbBF0273238dF5E9bc519DE5e20B";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
