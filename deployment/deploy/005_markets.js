const config = require('../config')
const deploy = require('../utils/deploy');
const { isTestnet } = require('../utils/env');
const execute = require('../utils/execute');
const view = require('../utils/view');

const ONE = 10n ** 18n 

const deployMarkets = async ({ getNamedAccounts, deployments }) => {
    const {
        deployer,
        multisig,
    } = await getNamedAccounts();

    const blocksPerYear = 2102400n

    // Create interest rates
    for (const token of config.tokens) {
        const baseApr = numberToMantissa(token.interestRate.baseApr)
        const kink = numberToMantissa(token.interestRate.targetUtil)
        const targetApr = numberToMantissa(token.interestRate.targetApr)
        const maxApr = numberToMantissa(token.interestRate.maxApr)

        const multiplierPerYear = ((targetApr - baseApr) * ONE) / kink
        const jumpMultiplierPerYear = ((maxApr - targetApr) * ONE) / ((ONE - kink))

        const isJumpRateModelDeployed = Boolean(await deployments.getOrNull(`JumpRateModelV2_${token.symbol}`))

        if (isJumpRateModelDeployed) {
            const JumpRateModel = await ethers.getContract(`JumpRateModelV2_${token.symbol}`, deployer)

            const multiplierPerBlock = (multiplierPerYear * ONE) / (blocksPerYear * kink)
            const baseRatePerBlock = baseApr / blocksPerYear
            const jumpMultiplierPerBlock = jumpMultiplierPerYear / blocksPerYear

            // No need to redeploy if all properties are the same
            if (
                (await JumpRateModel.multiplierPerBlock()).toBigInt() === multiplierPerBlock &&
                (await JumpRateModel.baseRatePerBlock()).toBigInt() === baseRatePerBlock &&
                (await JumpRateModel.jumpMultiplierPerBlock()).toBigInt() === jumpMultiplierPerBlock &&
                (await JumpRateModel.kink()).toBigInt() === kink
            ) {
                continue
            }
        }
        
        await deploy(`JumpRateModelV2_${token.symbol}`, {
            contract: 'JumpRateModelV2',
            args: [
                baseApr.toString(),
                multiplierPerYear.toString(),
                jumpMultiplierPerYear.toString(),
                kink.toString(),
                multisig,
            ],
            skipIfSameBytecode: true,
            log: true,
        })
    }

    // Create markets
    for (const token of config.tokens) {
        const comptrollerDeployment = await deployments.get('Unitroller')
        const interestRateModelDeployment = await deployments.get(`JumpRateModelV2_${token.symbol}`)

        let tokenDeployment = await (async () => {
            switch(token.type) {
                case 'eth': {
                    const underlyingDecimals = 18
                    const initialExchangeRateMantissa = (oneWithDecimals(underlyingDecimals) * ONE) / (BigInt(token.initialTokensPerUnderlying) * oneWithDecimals(token.decimals))

                    return await deploy(token.symbol, {
                        contract: 'CEther',
                        args: [
                            comptrollerDeployment.address,
                            interestRateModelDeployment.address,
                            initialExchangeRateMantissa.toString(),
                            token.name,
                            token.symbol,
                            8,
                            multisig
                        ],
                        skipIfAlreadyDeployed: true,
                        log: true,
                    })
                }
    
                case 'token': {
                    const underlying = await (async () => {
                        if (token.mock) {
                            if (!isTestnet) {
                                throw new Error('Cannot create mock token outside of testnet')
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
                    })()

                    const tokenAbi = [
                        "function decimals() view returns (uint8)",
                    ];
                    const underlyingContract = new ethers.Contract(underlying, tokenAbi, ethers.provider);

                    const underlyingDecimals = await underlyingContract.decimals()
                    const initialExchangeRateMantissa = (oneWithDecimals(underlyingDecimals) * ONE) / (BigInt(token.initialTokensPerUnderlying) * oneWithDecimals(token.decimals))

                    const delegate = await deploy(`CErc20Delegate_${token.symbol}`, {
                        contract: 'CErc20Delegate',
                        args: [],
                        skipIfSameBytecode: true,
                        log: true,
                    })
    
                    return await deploy(token.symbol, {
                        contract: 'CErc20Delegator',
                        args: [
                            underlying,
                            comptrollerDeployment.address,
                            interestRateModelDeployment.address,
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
                }
    
                default: {
                    throw new Error(`token type: ${token.type} not handled`)
                }
            }
        })()

        // TODO: Set oracle pricing strategy for token

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

        const collateralFactor = numberToMantissa(token.collateralFactor)

        if (collateralFactor !== market.collateralFactorMantissa.toBigInt()) {
            // TODO: uncomment after Oracle deploy
            // await execute({
            //     contractName: 'Comptroller',
            //     deploymentName: 'Unitroller',
            //     methodName: '_setCollateralFactor',
            //     args: [tokenDeployment.address, collateralFactor],
            // })
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

        const targetReserveFactor = numberToMantissa(token.reserve)

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