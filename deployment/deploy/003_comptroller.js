const hardhat = require("hardhat");

const config = require('../config');
const deploy = require("../utils/deploy");
const execute = require("../utils/execute");
const { assertSafeProxy } = require('../utils/storageLayout');
const view = require("../utils/view");

const deployComptroller = async ({ getNamedAccounts, deployments }) => {
  const {
    multisig,
    guardian,
  } = await getNamedAccounts();

  await assertSafeProxy(hardhat, 'Unitroller', 'Comptroller');

  for (const marketPool of config.marketPools) {
    const unitrollerDeploymentName = `${marketPool.name} Unitroller`;
    const comptrollerDeploymentName = `${marketPool.name} Comptroller`;

    const proxyDeployment = await deploy(unitrollerDeploymentName, {
      contract: 'Unitroller',
      skipIfAlreadyDeployed: true,
      log: true,
    });

    const implementationDeployment = await deploy(comptrollerDeploymentName, {
      contract: 'Comptroller',
      skipIfSameBytecode: true,
      log: true,
    });

    {
      const currentImplementationAddress = await view({
        contractName: 'Unitroller',
        deploymentName: unitrollerDeploymentName,
        methodName: 'comptrollerImplementation',
      });
      const pendingImplementationAddress = await view({
        contractName: 'Unitroller',
        deploymentName: unitrollerDeploymentName,
        methodName: 'pendingComptrollerImplementation',
      });

      if (currentImplementationAddress !== implementationDeployment.address && pendingImplementationAddress !== implementationDeployment.address) {
        await execute({
          contractName: 'Unitroller',
          deploymentName: unitrollerDeploymentName,
          methodName: '_setPendingImplementation',
          args: [implementationDeployment.address]
        });
      }
    }

    {
      const pendingImplementationAddress = await view({
        contractName: 'Unitroller',
        deploymentName: unitrollerDeploymentName,
        methodName: 'pendingComptrollerImplementation',
      });

      if (pendingImplementationAddress === implementationDeployment.address) {
        await execute({
          contractName: 'Comptroller',
          deploymentName: comptrollerDeploymentName,
          methodName: '_become',
          args: [proxyDeployment.address]
        });
      }
    }

    {
      // Set liquidation incentive

      const liquidationIncentiveMantissa = await view({
        contractName: 'Comptroller',
        deploymentName: unitrollerDeploymentName,
        methodName: 'liquidationIncentiveMantissa',
      });

      // 8% = 1.08
      const targetLiquidationIncentive = '1080000000000000000';

      if (liquidationIncentiveMantissa.toString() !== targetLiquidationIncentive) {
        await execute({
          contractName: 'Comptroller',
          deploymentName: unitrollerDeploymentName,
          methodName: '_setLiquidationIncentive',
          args: [targetLiquidationIncentive]
        });
        console.log('Updated liquidation incentive to 8%');
      }

      // Set close factor

      const closeFactor = await view({
        contractName: 'Comptroller',
        deploymentName: unitrollerDeploymentName,
        methodName: 'closeFactorMantissa',
      });

      // 25 %
      const targetCloseFactor = '250000000000000000';

      if (closeFactor.toString() !== targetCloseFactor) {
        await execute({
          contractName: 'Comptroller',
          deploymentName: unitrollerDeploymentName,
          methodName: '_setCloseFactor',
          args: [targetCloseFactor]
        });
      }

      // Set guardian

      const borrowCapGuardian = await view({
        contractName: 'Comptroller',
        deploymentName: unitrollerDeploymentName,
        methodName: 'borrowCapGuardian',
      });

      if (borrowCapGuardian !== guardian) {
        await execute({
          contractName: 'Comptroller',
          deploymentName: unitrollerDeploymentName,
          methodName: '_setBorrowCapGuardian',
          args: [guardian]
        });
      }

      const pauseGuardian = await view({
        contractName: 'Comptroller',
        deploymentName: unitrollerDeploymentName,
        methodName: 'pauseGuardian',
      });

      if (pauseGuardian !== guardian) {
        await execute({
          contractName: 'Comptroller',
          deploymentName: unitrollerDeploymentName,
          methodName: '_setPauseGuardian',
          args: [guardian]
        });
      }
    }

    const compDeployment = await deployments.get('Comp');

    const compAddress = await view({
      contractName: 'Comptroller',
      deploymentName: unitrollerDeploymentName,
      methodName: 'compAddress',
    });

    if (compAddress !== compDeployment.address) {
      await execute({
        contractName: 'Comptroller',
        deploymentName: unitrollerDeploymentName,
        methodName: '_setCompAddress',
        args: [compDeployment.address]
      });
    }

    // Set admin

    const admin = await view({
      contractName: 'Unitroller',
      deploymentName: unitrollerDeploymentName,
      methodName: 'admin',
    });
    let pendingAdmin = await view({
      contractName: 'Unitroller',
      deploymentName: unitrollerDeploymentName,
      methodName: 'pendingAdmin',
    });

    if (admin !== multisig && pendingAdmin !== multisig) {
      await execute({
        contractName: 'Unitroller',
        deploymentName: unitrollerDeploymentName,
        methodName: '_setPendingAdmin',
        args: [multisig]
      });
    }

    pendingAdmin = await view({
      contractName: 'Unitroller',
      deploymentName: unitrollerDeploymentName,
      methodName: 'pendingAdmin',
    });

    if (pendingAdmin === multisig) {
      await execute({
        contractName: 'Unitroller',
        deploymentName: unitrollerDeploymentName,
        methodName: '_acceptAdmin',
        forceProposal: true,
      });
    }
  }
};


deployComptroller.id = "003_comptroller";
deployComptroller.tags = [];

module.exports = deployComptroller;