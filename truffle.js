"use strict";

const Web3 = require("web3");
const fs = require('fs');
const path = require('path');

const networks = {
  rinkeby: 4,
  kovan: 42,
  ropsten: 3,
  mainnet: 1,
  goerli: 5
};

const infuraNetworks = Object.entries(networks).reduce((networks, [network, networkId]) => {
  return {
    ...networks,
    [network]: {
      provider: new Web3.providers.HttpProvider(`https://${network}.infura.io/`),
      network_id: networkId
    }
  }

  if (!networkProviderUrl) { // Not found from env nor from file, default to infura
    networkProviderUrl = `https://${network}.infura.io/v3/49d02fbc2d3d444e8f1a4487ed424753`;
  }

  if (privateKeyHex) {
    const provider = new WalletProvider(privateKeyHex, networkProviderUrl);
    const gas = 6600000;
    const gasPrice = 15000000000; // 15 gwei
    provider.opts = {gas, gasPrice};
    process.env[`${network}_opts`] = JSON.stringify(provider.opts);

    return {
      ...networks,
      [network]: {
        host: "localhost",
        port: 8545,
        network_id: "*",
        gas: gas,
        gasPrice: gasPrice,
        provider,
      }
    };
  } else {
    return networks;
  }
}, {});

let mochaOptions = {
  reporter: "mocha-multi-reporters",
  reporterOptions: {
    configFile: "reporterConfig.json"
  }
};

const development = {
  host: "localhost",
  port: 8545,
  network_id: "*",
  gas: 6700000,
  gasPrice: 20000,
}

const coverage = { // See example coverage settings at https://github.com/sc-forks/solidity-coverage
  host: "localhost",
  network_id: "*",
  gas: 0xffffffffff,
  gasPrice: 0x01,
  port: 8555
};

const test = {
  host: "localhost",
  port: 8545,
  network_id: "*",
  gas: 20000000,
  gasPrice: 20000
};

// configuration for scenario web3 contract defaults
process.env[`development_opts`] = JSON.stringify(development);
process.env[`coverage_opts`] = JSON.stringify(coverage);
process.env[`test_opts`] = JSON.stringify(test);

module.exports = {
  networks: {
    ...infuraNetworks,
    development,
    coverage,
    test
  },
  compilers: {
    solc: {
      version: "0.5.12",
      settings: {
        optimizer: {
          enabled: true
        }
      }
    }
  },
  plugins: ["solidity-coverage"],
  mocha: mochaOptions,
  contracts_build_directory: process.env.CONTRACTS_BUILD_DIRECTORY || undefined,
  build_directory: process.env.BUILD_DIRECTORY || undefined
};
