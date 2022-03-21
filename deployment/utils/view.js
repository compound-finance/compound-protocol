const { deployments } = require("hardhat");

module.exports = async function view({
  contractName,
  deploymentName,
  methodName,
  args = [],
}) {
  const {
    deployer,
  } = await getNamedAccounts();

  const deployment = await deployments.get(deploymentName || contractName);
  const contractFactory = await ethers.getContractFactory(contractName, deployer);
  const contract = contractFactory.attach(deployment.address);

  return contract[methodName](...args);
};