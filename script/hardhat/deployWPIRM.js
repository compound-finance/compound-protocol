const hre = require("hardhat");

require("dotenv").config();
async function main() {

  const baseRatePerYear = await toBN(process.env.BASE_RATE_PER_YEAR);
  const multiplierPerYear = await toBN(process.env.MULTIPLIER_PER_YEAR);
  const kink = Number(process.env.KINK);
  const jumpMultiplierPerYear = Number(process.env.JUMP_MULTIPLIER_PER_YEAR);

  const JumpRateModel = await hre.ethers.getContractFactory("JumpRateModel");
  const jumpRateModel = await JumpRateModel.deploy(
    baseRatePerYear,
    multiplierPerYear,
    jumpMultiplierPerYear,
    kink
  );
  await jumpRateModel.deployed();
  console.log("JumpRateModel deployed to:", jumpRateModel.address);
}

const toBN = async (value, scale = 18) => {
  const BigNumber = await hre.ethers.BigNumber;
  return BigNumber.from(value).mul(BigNumber.from(10).pow(scale));
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
