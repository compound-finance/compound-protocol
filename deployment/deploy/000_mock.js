const { isTestnet } = require("../utils/env");

const deployMocks = async () => {};

deployMocks.id = "000_mock";
deployMocks.tags = ["mocks"];
deployMocks.skip = () => !isTestnet;

module.exports = deployMocks;