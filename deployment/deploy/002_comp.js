const deploy = require("../utils/deploy");

const config = require('../config');

const deployComp = async ({ getNamedAccounts }) => {
  const {
    deployer,
  } = await getNamedAccounts();

  await deploy('Comp', {
    args: [
      deployer,
      config.comp.symbol,
      config.comp.name,
    ],
    skipIfAlreadyDeployed: true,
  });
};


deployComp.id = "002_comp";

module.exports = deployComp;