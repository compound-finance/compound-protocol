const config = require('../config')
const deploy = require("../utils/deploy");
const execute = require('../utils/execute');
const view = require('../utils/view');

const deployOracle = async ({ getNamedAccounts, deployments }) => {
    const {
        multisig,
    } = await getNamedAccounts()

    const oracle = await deploy('ChainlinkPriceOracle', {
        args: [
            multisig,
        ],
        skipIfSameBytecode: true,
    })

    const currentoracle = await view({
        contractName: 'Comptroller',
        deploymentName: 'Unitroller',
        methodName: 'oracle',
    })

    if(currentoracle !== oracle.address) {
        await execute({
            contractName: 'Comptroller',
            deploymentName: 'Unitroller',
            methodName: '_setPriceOracle',
            args: [oracle.address],
        })
    }
}


deployOracle.id = "004_oracle";

module.exports = deployOracle;