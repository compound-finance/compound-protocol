const deploy = require("../utils/deploy");


const deployTimelock = async ({ getNamedAccounts }) => {
  const {
    multisig,
  } = await getNamedAccounts();

  await deploy('Timelock', {
    args: [multisig, 2 * 24 * 3600],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};


deployTimelock.id = "001_timelock";
deployTimelock.tags = [];

module.exports = deployTimelock;