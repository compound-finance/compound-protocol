const { task } = require("hardhat/config");
const { saveContractAddress } = require("../utils");

task("deploy-simple-oracle").setAction(async (taskArgs, { ethers }) => {
  const PriceOracle = await ethers.getContractFactory("SimplePriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.deployed();

  console.log("SimplePriceOracle deployed to:", priceOracle.address);

  saveContractAddress(
    network.config.chainId,
    "SimplePriceOracle",
    priceOracle.address
  );

  return priceOracle.address;
});
