const {
    makeCToken,
    makePriceOracle,
    makeChainlinkAggregator,
    makeToken,
} = require("../Utils/Compound");
const { etherMantissa } = require("../Utils/Ethereum");

describe('PriceOracleChainlink', function () {
    let root, admin, accounts;
    beforeEach(async () => {
      [root, admin, ...accounts] = saddle.accounts;
    });

    describe('getUnderlyingPrice', () => {
        let underlying, cToken, cEther, priceOracle;

        beforeEach(async () => {
            underlying = await makeToken()
            cToken = await makeCToken({
                kind: 'cerc20',
                underlying,
            });
            cEther = await makeCToken({
                kind: 'cether',
            });
            priceOracle = await makePriceOracle({
                kind: 'chainlink',
                cEther,
            })
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

        it('get ether price', async () => {
            await send(priceOracle, '_setCEther', [cEther._address]);
            const result = await call(priceOracle, 'getUnderlyingPrice', [cEther._address]);
            expect(result).toEqualNumber(etherMantissa(1));
        })
    })
})