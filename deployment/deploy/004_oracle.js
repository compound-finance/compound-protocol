const config = require('../config');
const deploy = require("../utils/deploy");
const execute = require('../utils/execute');
const view = require('../utils/view');

const deployOracle = async ({ getNamedAccounts }) => {
  const {
    multisig,
  } = await getNamedAccounts();

  const oracle = await deploy('PriceOracleProxy', {
    args: [
      multisig,
    ],
    skipIfSameBytecode: true,
    skipUpgradeSafety: true,
  });

  for (const marketPool of config.marketPools) {
    const unitrollerDeploymentName = `${marketPool.name} Unitroller`;

    const currentoracle = await view({
      contractName: 'Comptroller',
      deploymentName: unitrollerDeploymentName,
      methodName: 'oracle',
    });

    if(currentoracle !== oracle.address) {
      await execute({
        contractName: 'Comptroller',
        deploymentName: unitrollerDeploymentName,
        methodName: '_setPriceOracle',
        args: [oracle.address],
      });
    }
  }
};


deployOracle.id = "004_oracle";

module.exports = deployOracle;