const hre = require("hardhat");
const { saveContractAddress } = require("./utils.js");

const comptrollerName = "Comptroller";
const unitrollerName = "Unitroller";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`Active network: ${network.name}, ${network.config.chainId}`);
  console.log(
    `Deploying ${unitrollerName} contract with the account:`,
    deployer.address
  );

  const Unitroller = await hre.ethers.getContractFactory("Unitroller");
  const unitroller = await Unitroller.deploy();

  console.log(`${unitrollerName} deployed to address:`, unitroller.address);

  console.log(
    `Deploying ${comptrollerName} contract with the account:`,
    deployer.address
  );

  const Comptroller = await hre.ethers.getContractFactory("Comptroller");
  const comptroller = await Comptroller.deploy();

  await comptroller.deployed();

  console.log(`${comptrollerName} deployed to address:`, comptroller.address);

  console.log(
    `SEND Tx => unitroller._setPendingImplementation(${comptroller.address})...`
  );

  (await unitroller._setPendingImplementation(comptroller.address)).wait(3);

  console.log(
    `SEND Tx => comptroller._acceptImplementation(${unitroller.address})...`
  );

  const gasLimit = await comptroller.estimateGas._become(unitroller.address);

  (
    await comptroller._become(unitroller.address, {
      gasLimit,
    })
  ).wait(3);

  console.log(
    `Comptroller ${
      comptroller.address
    } set as comptrollerImplementation ${comptroller.address ==
      (await unitroller.comptrollerImplementation())}`
  );

  saveContractAddress(
    network.config.chainId,
    unitrollerName,
    unitroller.address
  );

  saveContractAddress(
    network.config.chainId,
    comptrollerName,
    comptroller.address
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
