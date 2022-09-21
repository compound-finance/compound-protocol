
require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require('dotenv').config();
require("@nomiclabs/hardhat-etherscan");


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.5.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
    },
    development: {
      url: "http://localhost:8546"
    },
    mainnet: {
      url: process.env.ETH_RPC_URL,
      accounts: [process.env.ETH_PRIVATE_KEY]
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL,
      accounts: [process.env.ETH_PRIVATE_KEY]
    }
  },
  paths: {
    tests: "./hardhat/test"
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    //apiKey: process.env.ETHERSCAN_API_KEY
    apiKey: process.env.ARB_API_KEY
  },
};

