const { ethers } = require("ethers");

const config = require("../config");
const { isTestnet } = require("./env");

module.exports = async function getTokenAddress(addressOrname) {
  if (ethers.utils.isAddress(addressOrname)) {
    return addressOrname;
  }

  const mock = config.mocks[addressOrname];

  const deploymentName = (() => {
    if (mock === 'WETH') {
      return 'WETH9';
    }

    return `ERC20Mock_${addressOrname}`;
  })();

  if (!isTestnet) {
    throw new Error('Cannot use mock token outside of testnet');
  }

  const d = await deployments.get(deploymentName);
  return d.address;
};