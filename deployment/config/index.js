const hardhat = require("hardhat");

module.exports = (() => {
    if (hardhat.network.name === 'localhost' || hardhat.network.name === 'hardhat') {
        return require('./dev.json')
    }

    return require(`./${hardhat.network.name}.json`)
})()