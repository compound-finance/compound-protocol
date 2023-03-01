const { task } = require("hardhat/config");
const { saveContractAddress } = require("../utils");

task("deploy-xerc20-delegate").setAction(async (taskArgs, { ethers }) => {
  const contractName = "XErc20Delegate";
  const [deployer] = await ethers.getSigners();

  console.log(
    `Deploying ${contractName} contract with the account:`,
    deployer.address
  );

  const XErc20Delegate = await hre.ethers.getContractFactory(contractName);
  const xErc20Delegate = await XErc20Delegate.deploy();

  await xErc20Delegate.deployed();

  saveContractAddress(
    network.config.chainId,
    contractName,
    xErc20Delegate.address
  );

  console.log(`${contractName} deployed to address:`, xErc20Delegate.address);
  return xErc20Delegate;
});
