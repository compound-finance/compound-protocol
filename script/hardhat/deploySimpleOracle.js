const hre = require("hardhat");
const { saveContractAddress } = require("./utils.js");

async function main() {
  const PriceOracle = await hre.ethers.getContractFactory("SimplePriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.deployed();
  console.log("SimplePriceOracle deployed to:", priceOracle.address);

  saveContractAddress(
    network.config.chainId,
    "SimplePriceOracle",
    priceOracle.address
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
