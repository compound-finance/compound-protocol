
const config = require('../config');
const deploy = require('../utils/deploy');
const { isTestnet } = require("../utils/env");
const { oneWithDecimals } = require('../utils/numbers');

const deployMocks = async () => {
  const {
    deployer,
  } = await getNamedAccounts();

  for(const mockName in config.mocks) {
    const mock = config.mocks[mockName];

    if (mock === 'WETH') {
      await deploy(`WETH9`, {
        contract: 'WETH9',
        args: [],
        log: true,
        skipIfAlreadyDeployed: true,
      });
    } else {
      await deploy(`ERC20Mock_${mockName}`, {
        contract: 'ERC20Mock',
        args: [
          mock.name,
          mock.symbol,
          mock.decimals,
          deployer,
          (1000n * oneWithDecimals(mock.decimals)).toString(),
        ],
        log: true,
        skipIfAlreadyDeployed: true,
      });
    }
  }
};

deployMocks.id = "000_mock";
deployMocks.tags = ["mocks"];
deployMocks.skip = () => !isTestnet;

module.exports = deployMocks;
