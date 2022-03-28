const hardhat = require('hardhat');
const _ = require('lodash');

const config = require('../config');
const deploy = require('../utils/deploy');
const execute = require('../utils/execute');
const getTokenAddress = require('../utils/getTokenAddress');
const { numberToMantissa, oneWithDecimals } = require('../utils/numbers');
const { assertSafeProxy } = require('../utils/storageLayout');
const view = require('../utils/view');

const ZERO = 0n;
const ONE = 10n ** 18n;

// NOTE: number of seconds per year, but named blocksPerYear everywhere else in the codebase
const blocksPerYear = 31536000n;

const deployMarkets = async ({ getNamedAccounts, deployments }) => {
  const {
    multisig,
  } = await getNamedAccounts();

  await assertSafeProxy(hardhat, 'CWrappedNativeDelegator', 'CWrappedNativeDelegate');
  await assertSafeProxy(hardhat, 'CErc20Delegator', 'CErc20Delegate');

  /* Sanity checks */
  {
    const markets = _.flatMap(config.marketPools, x => x.markets);
    const marketNameMap = {};

    // Check for duplicate markets
    markets.forEach(market => {
      if (marketNameMap[market.symbol]) {
        throw new Error(`Duplicate ${market.symbol} market`);
      }

      marketNameMap[market.symbol] = true;
    });
  }

  for (const marketPool of config.marketPools) {
    const marketAddresses = [];

    const unitrollerDeploymentName = `${marketPool.name} Unitroller`;

    /* Create markets */
    for (const market of marketPool.markets) {
      /* Create interest rates */
      const interestRateModel = await getInterestRateModel(market);

      /* Create cToken */

      const comptrollerDeployment = await deployments.get(unitrollerDeploymentName);

      const underlying = await getTokenAddress(market.underlying);

      const tokenAbi = [
        "function decimals() view returns (uint8)",
      ];
      const underlyingContract = new hardhat.ethers.Contract(underlying, tokenAbi, ethers.provider);

      const underlyingDecimals = await underlyingContract.decimals();
      const initialExchangeRateMantissa = (oneWithDecimals(underlyingDecimals) * ONE) / (BigInt(market.initialTokensPerUnderlying) * oneWithDecimals(market.decimals));

      const tokenDeployment = await(async () => {
        switch(market.type) {
        case 'eth': {
          const delegate = await deploy(`CWrappedNativeDelegate_${market.symbol}`, {
            contract: 'CWrappedNativeDelegate',
            args: [],
            skipIfSameBytecode: true,
            log: true,
          });

          const cToken = await deploy(market.symbol, {
            contract: 'CWrappedNativeDelegator',
            args: [
              underlying,
              comptrollerDeployment.address,
              interestRateModel.address,
              initialExchangeRateMantissa.toString(),
              market.name,
              market.symbol,
              8,
              multisig,
              delegate.address,
              "0x",
            ],
            skipIfAlreadyDeployed: true,
            log: true,
          });

          return cToken;
        }

        case 'token': {
          const delegate = await deploy(`CErc20Delegate_${market.symbol}`, {
            contract: 'CErc20Delegate',
            args: [],
            skipIfSameBytecode: true,
            log: true,
          });

          const cToken = await deploy(market.symbol, {
            contract: 'CErc20Delegator',
            args: [
              underlying,
              comptrollerDeployment.address,
              interestRateModel.address,
              initialExchangeRateMantissa.toString(),
              market.name,
              market.symbol,
              8,
              multisig,
              delegate.address,
              "0x",
            ],
            skipIfAlreadyDeployed: true,
            log: true,
          });

          return cToken;
        }

        default: {
          throw new Error(`token type: ${market.type} not handled`);
        }
        }
      })();

      marketAddresses.push(tokenDeployment.address);


      /* Set interest rate model */

      const interestRateModelAddress = await view({
        contractName: 'CErc20',
        deploymentName: market.symbol,
        methodName: 'interestRateModel',
      });

      if (interestRateModel.address !== interestRateModelAddress) {
        await execute({
          contractName: 'CErc20',
          deploymentName: market.symbol,
          methodName: '_setInterestRateModel',
          args: [interestRateModelAddress]
        });
      }

      const m = await view({
        contractName: 'Comptroller',
        deploymentName: unitrollerDeploymentName,
        methodName: 'markets',
        args: [tokenDeployment.address],
      });

      if (!m.isListed) {
        await execute({
          contractName: 'Comptroller',
          deploymentName: unitrollerDeploymentName,
          methodName: '_supportMarket',
          args: [tokenDeployment.address],
        });
      }

      const collateralFactor = market.deprecated ? ZERO : numberToMantissa(market.collateralFactor);

      if (collateralFactor !== m.collateralFactorMantissa.toBigInt()) {
        await execute({
          contractName: 'Comptroller',
          deploymentName: unitrollerDeploymentName,
          methodName: '_setCollateralFactor',
          args: [tokenDeployment.address, collateralFactor],
        });
      }

      const targetCompSpeed = numberToMantissa(market.compPerSecond);

      const compSpeed = await view({
        contractName: 'Comptroller',
        deploymentName: unitrollerDeploymentName,
        methodName: 'compSpeeds',
        args: [tokenDeployment.address],
      });

      if (compSpeed.toBigInt() !== targetCompSpeed) {
        await execute({
          contractName: 'Comptroller',
          deploymentName: unitrollerDeploymentName,
          methodName: '_setCompSpeed',
          args: [tokenDeployment.address, targetCompSpeed],
        });
      }

      const targetReserveFactor = market.deprecated || market.borrowable === false ? ONE : numberToMantissa(market.reserve);

      const reserveFactor = await view({
        contractName: 'CErc20',
        deploymentName: market.symbol,
        methodName: 'reserveFactorMantissa',
        args: [],
      });

      if (reserveFactor.toBigInt() !== targetReserveFactor) {
        await execute({
          contractName: 'CErc20',
          deploymentName: market.symbol,
          methodName: '_setReserveFactor',
          args: [targetReserveFactor],
        });
      }

      const isPaused = await view({
        contractName: 'Comptroller',
        deploymentName: unitrollerDeploymentName,
        methodName: 'borrowGuardianPaused',
        args: [tokenDeployment.address],
      });

      if ((market.deprecated || market.borrowable === false) && !isPaused) {
        await execute({
          contractName: 'Comptroller',
          deploymentName: unitrollerDeploymentName,
          methodName: '_setBorrowPaused',
          args: [tokenDeployment.address, true],
        });
      }

      // const feeTaker = await view({
      //     contractName: 'CErc20',
      //     deploymentName: token.symbol,
      //     methodName: 'feeTaker',
      //     args: [],
      // })

      // if (feeTaker !== multisig) {
      //     await execute({
      //         contractName: 'CErc20',
      //         deploymentName: token.symbol,
      //         methodName: '_setFeeTaker',
      //         args: [multisig],
      //     })
      // }
    }


    /* Check that deleted markets are deprecated */

    const activeMarketAddresses = (await Promise.all((await view({
      contractName: 'Comptroller',
      deploymentName: unitrollerDeploymentName,
      methodName: 'getAllMarkets',
      args: [],
    })).map(async marketAddresses => {
      const isDeprecated = await view({
        contractName: 'Comptroller',
        deploymentName: unitrollerDeploymentName,
        methodName: 'isDeprecated',
        args: [marketAddresses],
      });

      return {
        address: marketAddresses,
        isDeprecated,
      };
    }))).filter(x => !x.isDeprecated).map(x => x.address);

    const incorrectMarketAddresses = activeMarketAddresses.filter(x => !marketAddresses.includes(x));

    if (incorrectMarketAddresses.length > 0) {
      throw new Error(`Markets ${incorrectMarketAddresses.join(',')} are active but they are no longer tracked`);
    }
  }
};

deployMarkets.id = "005_markets";

module.exports = deployMarkets;


async function getInterestRateModel(market) {
  const {
    deployer,
    multisig,
  } = await getNamedAccounts();

  const {
    name,
    baseApr,
    kink,
    targetApr,
    maxApr,
  } = (() => {
    if (market.borrowable === false) {
      return {
        name: `UnBorrowableRateModel`,
        baseApr: numberToMantissa(0),
        kink: numberToMantissa(0.5),
        targetApr: numberToMantissa(0),
        maxApr: numberToMantissa(0),
      };
    }

    return {
      name: `${market.symbol}RateModel`,
      baseApr: numberToMantissa(market.interestRate.baseApr),
      kink: numberToMantissa(market.interestRate.targetUtil),
      targetApr: numberToMantissa(market.interestRate.targetApr),
      maxApr: numberToMantissa(market.interestRate.maxApr),
    };
  })();

  const multiplierPerYear = ((targetApr - baseApr) * ONE) / kink;
  const jumpMultiplierPerYear = ((maxApr - targetApr) * ONE) / ((ONE - kink));

  const interestRateModel = await deploy(name, {
    contract: 'JumpRateModelV2',
    args: [
      baseApr.toString(),
      multiplierPerYear.toString(),
      jumpMultiplierPerYear.toString(),
      kink.toString(),
      multisig,
    ],
    skipIfSameBytecode: true,
    skipUpgradeSafety: true,
    log: true,
  });

  const JumpRateModel = await hardhat.ethers.getContract(name, deployer);

  const multiplierPerBlock = (multiplierPerYear * ONE) / (blocksPerYear * kink);
  const baseRatePerBlock = baseApr / blocksPerYear;
  const jumpMultiplierPerBlock = jumpMultiplierPerYear / blocksPerYear;

  if (
    (await JumpRateModel.multiplierPerBlock()).toBigInt() !== multiplierPerBlock ||
        (await JumpRateModel.multiplierPerBlock()).toBigInt() !== multiplierPerBlock ||
        (await JumpRateModel.baseRatePerBlock()).toBigInt() !== baseRatePerBlock ||
        (await JumpRateModel.jumpMultiplierPerBlock()).toBigInt() !== jumpMultiplierPerBlock ||
        (await JumpRateModel.kink()).toBigInt() !== kink
  ) {
    await JumpRateModel.updateJumpRateModel(
      baseApr.toString(),
      multiplierPerYear.toString(),
      jumpMultiplierPerYear.toString(),
      kink.toString(),
    );
  }

  return interestRateModel;
}