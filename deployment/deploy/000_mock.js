const deploy = require("../utils/deploy");
const { isTestnet } = require("../utils/env");

const deployMocks = async ({ getNamedAccounts, deployments }) => {
}

deployMocks.id = "000_mock";
deployMocks.tags = ["mocks"];
deployMocks.skip = () => !isTestnet;

module.exports = deployMocks;