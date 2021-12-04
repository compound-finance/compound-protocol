// const ethers = require("ethers");

require("@nomiclabs/hardhat-solhint");
require("hardhat-deploy");
require("hardhat-contract-sizer");
require("hardhat-deploy-ethers");

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
    },
    throwOnTransactionFailures: true,
    namedAccounts: {
      deployer: {
        default: 0,
        localhost: 0,
      },
      multisig: {
        default: 0,
        localhost: 0,
      },
      guardian: {
        default: 0,
        localhost: 0,
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
  