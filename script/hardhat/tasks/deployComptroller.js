const { task } = require("hardhat/config");
const { saveContractAddress } = require("../utils");

task("deploy-comptroller").setAction(async (taskArgs, { ethers }) => {
  const comptrollerName = "Comptroller";

  const [deployer] = await ethers.getSigners();

  console.log(`Active network: ${network.name}, ${network.config.chainId}`);
  console.log(
    `Deploying ${comptrollerName} contract with the account:`,
    deployer.address
  );

  const Comptroller = await hre.ethers.getContractFactory("Comptroller");
  const comptroller = await Comptroller.deploy();

  await comptroller.deployed();

  console.log(`${comptrollerName} deployed to address:`, comptroller.address);

  saveContractAddress(
    network.config.chainId,
    comptrollerName,
    comptroller.address
  );

  return comptroller;
});
