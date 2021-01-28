require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-etherscan')
require('hardhat-deploy')
require('dotenv').config()

require('@eth-optimism/smock/build/src/plugins/hardhat-storagelayout')

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.5.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks:{
    rinkeby:{
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      accounts: [process.env.RINKEBY_PRIVKEY]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  namedAccounts: {
    ethFeed:{
      1:"0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      4:"0x8A753747A1Fa494EC906cE90E9f37563A8AF630e"
    },
    gov:{
      1:0, // TODO: set to gov Timelock later -> "0x926dF14a23BE491164dCF93f4c468A50ef659D5B"
      4:0
    },
    deployer:{
      default:0
    }
  }
};

