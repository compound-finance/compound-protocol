require("@nomiclabs/hardhat-waffle");

require('@eth-optimism/smock/build/src/plugins/hardhat-storagelayout')

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.5.16",
};

