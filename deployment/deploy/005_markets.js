const hardhat = require('hardhat')

const config = require('../config');
const deploy = require('../utils/deploy');
const { isTestnet } = require('../utils/env');
const execute = require('../utils/execute');
const view = require('../utils/view');

const ZERO = 0n
const ONE = 10n ** 18n

const deployMarkets = async ({ getNamedAccounts, deployments }) => {
    const {
        deployer,
        multisig,
    } = await getNamedAccounts();

    // NOTE: number of seconds per year, but named blocksPerYear everywhere else in the codebase
    const blocksPerYear = 31536000n

    const marketAddresses = []

    /* Create markets */
    for (const token of config.tokens) {
        /* Create interest rates */

        const baseApr = numberToMantissa(token.interestRate.baseApr)
        const kink = numberToMantissa(token.interestRate.targetUtil)
        const targetApr = numberToMantissa(token.interestRate.targetApr)
        const maxApr = numberToMantissa(token.interestRate.maxApr)

        const multiplierPerYear = ((targetApr - baseApr) * ONE) / kink
        const jumpMultiplierPerYear = ((maxApr - targetApr) * ONE) / ((ONE - kink))

        const interestRateModel = await deploy(`${token.symbol}RateModel`, {
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
        })

        const JumpRateModel = await hardhat.ethers.getContract(`${token.symbol}RateModel`, deployer)

        const multiplierPerBlock = (multiplierPerYear * ONE) / (blocksPerYear * kink)
        const baseRatePerBlock = baseApr / blocksPerYear
        const jumpMultiplierPerBlock = jumpMultiplierPerYear / blocksPerYear

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
            )
        }

        /* Create cToken */

        const comptrollerDeployment = await deployments.get('Unitroller')

        const underlying = await getTokenAddress(token)

        const tokenAbi = [
            "function decimals() view returns (uint8)",
        ];
        const underlyingContract = new hardhat.ethers.Contract(underlying, tokenAbi, ethers.provider);

        const underlyingDecimals = await underlyingContract.decimals()
        const initialExchangeRateMantissa = (oneWithDecimals(underlyingDecimals) * ONE) / (BigInt(token.initialTokensPerUnderlying) * oneWithDecimals(token.decimals))

        let tokenDeployment = await (async () => {
            switch(token.type) {
                case 'eth': {
                    const delegate = await deploy(`CWrappedNativeDelegate_${token.symbol}`, {
                        contract: 'CWrappedNativeDelegate',
                        args: [],
                        skipIfSameBytecode: true,
                        log: true,
                    })

                    const cToken = await deploy(token.symbol, {
                        contract: 'CWrappedNativeDelegator',
                        args: [
                            underlying,
                            comptrollerDeployment.address,
                            JumpRateModel.address,
                            initialExchangeRateMantissa.toString(),
                            token.name,
                            token.symbol,
                            8,
                            multisig,
                            delegate.address,
                            "0x",
                        ],
                        skipIfAlreadyDeployed: true,
                        log: true,
                    })

                    return cToken
                }
    
                case 'token': {
                    const delegate = await deploy(`CErc20Delegate_${token.symbol}`, {
                        contract: 'CErc20Delegate',
                        args: [],
                        skipIfSameBytecode: true,
                        log: true,
                    })

                    const cToken = await deploy(token.symbol, {
                        contract: 'CErc20Delegator',
                        args: [
                            underlying,
                            comptrollerDeployment.address,
                            JumpRateModel.address,
                            initialExchangeRateMantissa.toString(),
                            token.name,
                            token.symbol,
                            8,
                            multisig,
                            delegate.address,
                            "0x",
                        ],
                        skipIfAlreadyDeployed: true,
                        log: true,
                    })

                    return cToken
                }
    
                default: {
                    throw new Error(`token type: ${token.type} not handled`)
                }
            }
        })()

        marketAddresses.push(tokenDeployment.address)

        /* Setup price oracle for underlying token */

        switch(token.oracle.type) {
            case 'fixed': {
                const targetFixedPrice = numberToMantissa(token.oracle.price)
                const fixedPrice = await view({
                    contractName: 'PriceOracleProxy',
                    methodName: 'fixedPrices',
                    args: [underlying],
                })

                if (fixedPrice !== targetFixedPrice) {
                    await execute({
                        contractName: 'PriceOracleProxy',
                        methodName: '_setFixedPrice',
                        args: [underlying, targetFixedPrice],
                    })
                }

                break
            }

            case 'chainlink': {
                const targetPriceAggregator = token.oracle.aggregator
                const priceAggregator = await view({
                    contractName: 'PriceOracleProxy',
                    methodName: 'aggregators',
                    args: [underlying],
                })

                if (priceAggregator !== targetPriceAggregator) {
                    await execute({
                        contractName: 'PriceOracleProxy',
                        methodName: '_setAggregator',
                        args: [underlying, targetPriceAggregator],
                    })
                }

                break
            }
        }

        /* Set interest rate model */

        const interestRateModelAddress = await view({
            contractName: 'CErc20',
            deploymentName: token.symbol,
            methodName: 'interestRateModel',
        })

        if (interestRateModel.address !== interestRateModelAddress) {
            await execute({
                contractName: 'CErc20',
                deploymentName: token.symbol,
                methodName: '_setInterestRateModel',
                args: [interestRateModelAddress]
            })
        }

        const market = await view({
            contractName: 'Comptroller',
            deploymentName: 'Unitroller',
            methodName: 'markets',
            args: [tokenDeployment.address],
        })

        if (!market.isListed) {
            await execute({
                contractName: 'Comptroller',
                deploymentName: 'Unitroller',
                methodName: '_supportMarket',
                args: [tokenDeployment.address],
            })
        }

        const collateralFactor = token.deprecated ? ZERO : numberToMantissa(token.collateralFactor)

        if (collateralFactor !== market.collateralFactorMantissa.toBigInt()) {
            await execute({
                contractName: 'Comptroller',
                deploymentName: 'Unitroller',
                methodName: '_setCollateralFactor',
                args: [tokenDeployment.address, collateralFactor],
            })
        }

        const targetCompSpeed = numberToMantissa(token.compPerSecond)

        const compSpeed = await view({
            contractName: 'Comptroller',
            deploymentName: 'Unitroller',
            methodName: 'compSpeeds',
            args: [tokenDeployment.address],
        })

        if (compSpeed.toBigInt() !== targetCompSpeed) {
            await execute({
                contractName: 'Comptroller',
                deploymentName: 'Unitroller',
                methodName: '_setCompSpeed',
                args: [tokenDeployment.address, targetCompSpeed],
            })
        }

        const targetReserveFactor = token.deprecated ? ONE : numberToMantissa(token.reserve)

        const reserveFactor = await view({
            contractName: 'CErc20',
            deploymentName: token.symbol,
            methodName: 'reserveFactorMantissa',
            args: [],
        })

        if (reserveFactor.toBigInt() !== targetReserveFactor) {
            await execute({
                contractName: 'CErc20',
                deploymentName: token.symbol,
                methodName: '_setReserveFactor',
                args: [targetReserveFactor],
            })
        }

        const isPaused = await view({
            contractName: 'Comptroller',
            deploymentName: 'Unitroller',
            methodName: 'borrowGuardianPaused',
            args: [tokenDeployment.address],
        })

        if (token.deprecated && !isPaused) {
            await execute({
                contractName: 'Comptroller',
                deploymentName: 'Unitroller',
                methodName: '_setBorrowPaused',
                args: [tokenDeployment.address, true],
            })
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
        deploymentName: 'Unitroller',
        methodName: 'getAllMarkets',
        args: [],
    })).map(async marketAddresses => {
        const isDeprecated = await view({
            contractName: 'Comptroller',
            deploymentName: 'Unitroller',
            methodName: 'isDeprecated',
            args: [marketAddresses],
        })

        return {
            address: marketAddresses,
            isDeprecated,
        }
    }))).filter(x => !x.isDeprecated).map(x => x.address)

    const incorrectMarketAddresses = activeMarketAddresses.filter(x => !marketAddresses.includes(x))

    if (incorrectMarketAddresses.length > 0) {
        throw new Error(`Markets ${incorrectMarketAddresses.join(',')} are active but they are no longer tracked`)
    }
}

deployMarkets.id = "005_markets";

module.exports = deployMarkets;


function numberToMantissa(number) {
    let [integrerPart, decimalPart] = number.toString().split('.')

    if (!decimalPart) {
        decimalPart = ''
    }

    return BigInt(integrerPart + decimalPart.slice(0, 18).padEnd(18, '0'))
}

function oneWithDecimals(decimals) {
    return 10n ** BigInt(decimals)
}

// Get token address, deploy a mock if required
async function getTokenAddress(token) {
    const {
        deployer
    } = await getNamedAccounts();

    if (token.mock) {
        if (!isTestnet) {
            throw new Error('Cannot create mock token outside of testnet')
        }

        if (token.type === 'eth') {
            const weth = await deploy(`WETH9`, {
                contract: 'WETH9',
                args: [],
                log: true,
                skipIfAlreadyDeployed: true,
            })

            return weth.address
        }

        const mockDeploy = await deploy(`ERC20Mock_${token.mock.symbol}`, {
            contract: 'ERC20Mock',
            args: [
                token.mock.name,
                token.mock.symbol,
                token.mock.decimals,
                deployer,
                (1000n * oneWithDecimals(token.mock.decimals)).toString(),
            ],
            log: true,
            skipIfAlreadyDeployed: true,
        })

        return mockDeploy.address
    }

    return token.underlying
}