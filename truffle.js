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
  };
}, {});

let mochaOptions = {
  reporter: "mocha-multi-reporters",
  reporterOptions: {
    configFile: "reporterConfig.json"
  }
};

if (process.env.NETWORK === 'coverage') {
  mochaOptions = {
    enableTimeouts: false,
    grep: /@gas/,
    invert: true
  };
}

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
  gas: 0xfffffffffff,
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
      version: "0.5.8",
      settings: {
        optimizer: {
          enabled: true
        }
      }
    }
  },
  mocha: mochaOptions,
  contracts_build_directory: process.env.CONTRACTS_BUILD_DIRECTORY || undefined,
  build_directory: process.env.BUILD_DIRECTORY || undefined
};
