const config = require('../config');
const deploy = require("../utils/deploy");
const execute = require('../utils/execute');
const getTokenAddress = require('../utils/getTokenAddress');
const { numberToMantissa } = require('../utils/numbers');
const view = require('../utils/view');

const deployOracle = async ({ getNamedAccounts }) => {
  const {
    multisig,
  } = await getNamedAccounts();

  const oracle = await deploy('PriceOracleProxy', {
    args: [
      multisig,
      await getBase(config.oracle.base),
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

  for (const key in config.oracle.tokens) {
    const oracle = config.oracle.tokens[key];

    const underlying = await getTokenAddress(key);

    switch(oracle.type) {
    case 'exchangeRate': {
      const targetExchangeRate = numberToMantissa(oracle.exchangeRate);
      const exchangeRate = await view({
        contractName: 'PriceOracleProxy',
        methodName: 'exchangeRates',
        args: [underlying],
      });

      const base = await getBase(oracle.base);

      if (!exchangeRate.exchangeRate.eq(targetExchangeRate)) {
        await execute({
          contractName: 'PriceOracleProxy',
          methodName: '_setExchangeRate',
          args: [underlying, base, targetExchangeRate],
        });
      }

      break;
    }

    case 'chainlink': {
      const targetPriceAggregator = oracle.aggregator;
      const priceAggregator = await view({
        contractName: 'PriceOracleProxy',
        methodName: 'aggregators',
        args: [underlying],
      });

      if (priceAggregator !== targetPriceAggregator) {
        await execute({
          contractName: 'PriceOracleProxy',
          methodName: '_setAggregator',
          args: [underlying, targetPriceAggregator],
        });
      }

      break;
    }

    default: {
      throw new Error('Incorrect oracle type');
    }
    }
  }
};


deployOracle.id = "004_oracle";

module.exports = deployOracle;

async function getBase(base) {
  if (base.toLowerCase() === 'usd') {
    return '0x0000000000000000000000000000000000000000';
  }

  return await getTokenAddress(base);
}