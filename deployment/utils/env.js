const hardhat = require('hardhat');

const isLocalhost = hardhat.network.name === 'localhost' || hardhat.network.name === 'hardhat';

const isTestnet = isLocalhost || hardhat.network.name === 'rinkeby'

module.exports = {
    isLocalhost,
    isTestnet
}