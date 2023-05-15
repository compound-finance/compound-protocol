require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("hardhat-abi-exporter");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("hardhat-spdx-license-identifier");
require("hardhat-watcher");
require("hardhat-contract-sizer");
require("hardhat-storage-layout-diff");

// require("./script/hardhat/tasks");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  // defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
    },
    dev: {
      // Default to 1
      default: 0,
    },
  },
  networks: {
    hardhat: {
      // forking: {
      //   url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      //   blockNumber: 13178618,
      // }
    },
    c1_devnet: {
      url: process.env.C1_DEVNET_RPC_URL,
      accounts: [`0x${process.env.PK}`],
      chainId: 200101,
      gas: "auto",
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
    spdxLicenseIdentifier: {
      overwrite: false,
      runOnCompile: true,
    },
    watcher: {
      compile: {
        tasks: ["compile"],
        files: ["./contracts"],
        verbose: true,
      },
    },
  },
  mocha: {
    timeout: 10000,
  },
  paths: {
    tests: "./tests/hardhat",
  },
};
