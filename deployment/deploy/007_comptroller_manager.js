const deploy = require("../utils/deploy");

const deployComptrollerManager = async () => {
  await deploy('ComptrollerManager', {
    args: [],
    skipIfSameBytecode: true,
    skipUpgradeSafety: true,
  });
};


deployComptrollerManager.id = "007_comptroller_manager";

module.exports = deployComptrollerManager;