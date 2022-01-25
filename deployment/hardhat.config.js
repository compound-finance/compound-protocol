const { assertStorageLayoutChangeSafeForAll } = require('./utils/storageLayout');

require('dotenv').config()

require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-solhint");
require("hardhat-deploy");
require("hardhat-contract-sizer");
require("hardhat-deploy-ethers");
require("@nomiclabs/hardhat-ethers");

task(
  "checkUpgradabilityAll",
  "Checks storage slot upgradability for all contracts"
).setAction(assertStorageLayoutChangeSafeForAll);

module.exports = {
    solidity: {
      version: "0.5.16",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
    networks: {
      hardhat: {
        chainId: 999,
        initialBaseFeePerGas: 0,
      },
      localhost: {
        timeout: 60000,
      },
      rinkeby: {
        url: process.env.RINKEBY_PROVIDER_URL,
        accounts: [
          process.env.RINKEBY_DEPLOYER_PK,
        ],
        gas: 'auto',
        gasPrice: 2000000000,
      },
    },
    throwOnTransactionFailures: true,
    namedAccounts: {
      deployer: {
        default: 0,
        localhost: 0,
        rinkeby: process.env.RINKEBY_DEPLOYER,
      },
      multisig: {
        default: 0,
        localhost: 0,
        rinkeby: process.env.RINKEBY_DEPLOYER,
      },
      guardian: {
        default: 0,
        localhost: 0,
        rinkeby: process.env.RINKEBY_DEPLOYER,
      }
    },
    contractSizer: {
      alphaSort: true,
      runOnCompile: true,
    },
    paths: {
      root: '../',
      deploy: 'deployment/deploy',
    },
  };
  