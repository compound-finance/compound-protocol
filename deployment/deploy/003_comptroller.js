const config = require('../config')
const deploy = require("../utils/deploy");
const execute = require("../utils/execute");
const view = require("../utils/view");

const deployComptroller = async ({ getNamedAccounts, deployments }) => {
    const {
        multisig,
        guardian,
    } = await getNamedAccounts();

    const proxyDeployment = await deploy('Unitroller', {
        log: true,
    })

    const implementationDeployment = await deploy('Comptroller', {
        log: true,
    })

    {
        const currentImplementationAddress = await view({
            contractName: 'Unitroller',
            methodName: 'comptrollerImplementation',
        })
        const pendingImplementationAddress = await view({
            contractName: 'Unitroller',
            methodName: 'pendingComptrollerImplementation',
        })

        if (currentImplementationAddress !== implementationDeployment.address && pendingImplementationAddress !== implementationDeployment.address) {
            await execute({
                contractName: 'Unitroller',
                methodName: '_setPendingImplementation',
                args: [implementationDeployment.address]
            })
        }
    }

    {
        const pendingImplementationAddress = await view({
            contractName: 'Unitroller',
            methodName: 'pendingComptrollerImplementation',
        })

        if (pendingImplementationAddress === implementationDeployment.address) {
            await execute({
                contractName: 'Comptroller',
                methodName: '_become',
                args: [proxyDeployment.address]
            })
        }
    }

    {
        // Set liquidation incentive

        const liquidationIncentiveMantissa = await view({
            contractName: 'Comptroller',
            deploymentName: 'Unitroller',
            methodName: 'liquidationIncentiveMantissa',
        })

        // 8% = 1.08
        const targetLiquidationIncentive = '1080000000000000000'
        
        if (liquidationIncentiveMantissa.toString() !== targetLiquidationIncentive) {
            await execute({
                contractName: 'Comptroller',
                deploymentName: 'Unitroller',
                methodName: '_setLiquidationIncentive',
                args: [targetLiquidationIncentive]
            })
            console.log('Updated liquidation incentive to 8%')
        }

        // Set close factor 

        const closeFactor = await view({
            contractName: 'Comptroller',
            deploymentName: 'Unitroller',
            methodName: 'closeFactorMantissa',
        })

        // 25 %
        const targetCloseFactor = '250000000000000000'

        if (closeFactor.toString() !== targetCloseFactor) {
            await execute({
                contractName: 'Comptroller',
                deploymentName: 'Unitroller',
                methodName: '_setCloseFactor',
                args: [targetCloseFactor]
            })
        }

        // Set guardian

        const borrowCapGuardian = await view({
            contractName: 'Comptroller',
            deploymentName: 'Unitroller',
            methodName: 'borrowCapGuardian',
        })

        if (borrowCapGuardian !== guardian) {
            await execute({
                contractName: 'Comptroller',
                deploymentName: 'Unitroller',
                methodName: '_setBorrowCapGuardian',
                args: [guardian]
            })
        }

        const pauseGuardian = await view({
            contractName: 'Comptroller',
            deploymentName: 'Unitroller',
            methodName: 'pauseGuardian',
        })

        if (pauseGuardian !== guardian) {
            await execute({
                contractName: 'Comptroller',
                deploymentName: 'Unitroller',
                methodName: '_setPauseGuardian',
                args: [guardian]
            })
        }
    }

    const compDeployment = await deployments.get('Comp')

    const compAddress = await view({
        contractName: 'Comptroller',
        deploymentName: 'Unitroller',
        methodName: 'compAddress',
    })

    if (compAddress !== compDeployment.address) {
        await execute({
            contractName: 'Comptroller',
            deploymentName: 'Unitroller',
            methodName: '_setCompAddress',
            args: [compDeployment.address]
        })
    }

    const ethAddress = await view({
        contractName: 'Comptroller',
        deploymentName: 'Unitroller',
        methodName: 'weth',
    })

    if (ethAddress !== config.weth) {
        await execute({
            contractName: 'Comptroller',
            deploymentName: 'Unitroller',
            methodName: '_setWEthAddress',
            args: [config.weth]
        })
    }

    // Set admin

    const admin = await view({
        contractName: 'Unitroller',
        methodName: 'admin',
    })
    let pendingAdmin = await view({
        contractName: 'Unitroller',
        methodName: 'pendingAdmin',
    })

    if (admin !== multisig && pendingAdmin !== multisig) {
        await execute({
            contractName: 'Unitroller',
            methodName: '_setPendingAdmin',
            args: [multisig]
        })
    }

    pendingAdmin = await view({
        contractName: 'Unitroller',
        methodName: 'pendingAdmin',
    })

    if (pendingAdmin === multisig) {
        await execute({
            contractName: 'Unitroller',
            methodName: '_acceptAdmin',
            forceProposal: true,
        })
    }
}


deployComptroller.id = "003_comptroller";
deployComptroller.tags = [];

module.exports = deployComptroller;