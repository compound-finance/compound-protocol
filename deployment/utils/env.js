const hardhat = require("hardhat");

const isLocalhost = hardhat.network.name === "localhost" || hardhat.network.name === "hardhat";

const isTestnet = isLocalhost

module.exports = {
    isLocalhost,
    isTestnet
}