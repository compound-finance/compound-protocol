const { task } = require("hardhat/config");
const { saveContractAddress } = require("../utils");

task("deploy-unitroller").setAction(async (taskArgs, { ethers }) => {
  const unitrollerName = "Unitroller";

  const [deployer] = await ethers.getSigners();

  console.log(`Active network: ${network.name}, ${network.config.chainId}`);
  console.log(
    `Deploying ${unitrollerName} contract with the account:`,
    deployer.address
  );

  const Unitroller = await hre.ethers.getContractFactory("Unitroller");
  const unitroller = await Unitroller.deploy();

  console.log(`${unitrollerName} deployed to address:`, unitroller.address);

  // console.log(
  //   `SEND Tx => unitroller._setPendingImplementation(${unitroller.address})...`
  // );

  // (await unitroller._setPendingImplementation(unitroller.address)).wait(3);

  // console.log(
  //   `SEND Tx => comptroller._acceptImplementation(${unitroller.address})...`
  // );

  // const gasLimit = await comptroller.estimateGas._become(unitroller.address);

  // (
  //   await comptroller._become(unitroller.address, {
  //     gasLimit,
  //   })
  // ).wait(3);

  // console.log(
  //   `Comptroller ${
  //     comptroller.address
  //   } set as comptrollerImplementation ${comptroller.address ==
  //     (await unitroller.comptrollerImplementation())}`
  // );

  saveContractAddress(
    network.config.chainId,
    unitrollerName,
    unitroller.address
  );

  return unitroller;
});
