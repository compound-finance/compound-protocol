const {
    makeCToken,
    makePriceOracle,
    makeChainlinkAggregator,
    makeToken,
    makeComptroller,
} = require("../Utils/Compound");
const { etherMantissa } = require("../Utils/Ethereum");

describe('PriceOracleChainlink', function () {
    let root, admin, accounts;
    beforeEach(async () => {
      [root, admin, ...accounts] = saddle.accounts;
    });

    describe('getUnderlyingPrice', () => {
        let priceOracle, comptroller, underlying, cToken, cEther;

        beforeEach(async () => {
            priceOracle = await makePriceOracle({
                kind: 'chainlink',
            })
            comptroller = await makeComptroller({priceOracle})
            underlying = await makeToken({})
            cToken = await makeCToken({
                kind: 'cerc20',
                underlying,
                comptroller,
            });
            cEther = await makeCToken({
                kind: 'cether',
                comptroller,
            });
        });

        it('get token price', async () => {
            const aggregator = await makeChainlinkAggregator({
                decimals: 8,
                answer: '400000000000',
            });
            await send(priceOracle, '_setAggregator', [underlying._address, aggregator._address]);
            const result = await call(priceOracle, 'getUnderlyingPrice', [cToken._address]);
            expect(result).toEqualNumber(etherMantissa(4000));
        })

        it('get price of token with 8 decimals', async () => {
            underlying = await makeToken({
                decimals: 8,
            });
            cToken = await makeCToken({
                kind: 'cerc20',
                underlying,
                comptroller,
            });
            const aggregator = await makeChainlinkAggregator({
                decimals: 8,
                answer: '3600000000000',
            });
            await send(priceOracle, '_setAggregator', [underlying._address, aggregator._address]);
            const result = await call(priceOracle, 'getUnderlyingPrice', [cToken._address]);
            expect(result).toEqualNumber(etherMantissa(360000000000000));
        });

        it('get ether price', async () => {
            const aggregator = await makeChainlinkAggregator({
                decimals: 8,
                answer: '100000000',
            });
            await send(priceOracle, '_setAggregator', [comptroller.weth._address, aggregator._address]);
            const result = await call(priceOracle, 'getUnderlyingPrice', [cEther._address]);
            expect(result).toEqualNumber(etherMantissa(1));
        })
    })
})