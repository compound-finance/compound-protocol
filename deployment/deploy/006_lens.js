const deploy = require("../utils/deploy");

const deployComptrollerLens = async ({}) => {
    await deploy('CompoundLens', {
        args: [],
        skipIfSameBytecode: true,
        skipUpgradeSafety: true,
    })
}


deployComptrollerLens.id = "006_lens";

module.exports = deployComptrollerLens;