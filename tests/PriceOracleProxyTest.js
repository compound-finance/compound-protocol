const {
  makeCToken,
  makePriceOracle,
  makeChainlinkAggregator,
  makeToken,
  makeComptroller,
} = require("./Utils/Compound");
const { etherMantissa } = require("./Utils/Ethereum");

describe('PriceOracleProxy', function () {
  describe('getUnderlyingPrice', () => {
    let priceOracle, comptroller, underlying, BTC, cToken, cEther, cBTC;

    beforeEach(async () => {
      priceOracle = await makePriceOracle({
        kind: 'proxy',
      });
      comptroller = await makeComptroller({priceOracle});
      underlying = await makeToken({});
      cToken = await makeCToken({
        kind: 'cerc20',
        underlying,
        comptroller,
      });
      cEther = await makeCToken({
        kind: 'cwrappednative',
        comptroller,
      });
      BTC = await makeToken({
        decimals: 8,
      });
      cBTC = await makeCToken({
        kind: 'cerc20',
        underlying: BTC,
        comptroller,
      });
    });

    it('get token price from chainlink', async () => {
      const aggregator = await makeChainlinkAggregator({
        decimals: 8,
        answer: '400000000000',
      });
      await send(priceOracle, '_setAggregator', [underlying._address, aggregator._address]);
      const result = await call(priceOracle, 'getUnderlyingPrice', [cToken._address]);
      expect(result).toEqualNumber(etherMantissa(4000));
    });

    it('get price of BTC from chainlink', async () => {
      const aggregator = await makeChainlinkAggregator({
        decimals: 8,
        answer: '3600000000000',
      });
      await send(priceOracle, '_setAggregator', [BTC._address, aggregator._address]);
      const result = await call(priceOracle, 'getUnderlyingPrice', [cBTC._address]);
      expect(result).toEqualNumber(etherMantissa(360000000000000));
    });

    it('get fixed token price', async () => {
      await send(priceOracle, '_setExchangeRate', [underlying._address, '0x0000000000000000000000000000000000000000', '4000000000000000000000']);
      const result = await call(priceOracle, 'getUnderlyingPrice', [cToken._address]);
      expect(result).toEqualNumber(etherMantissa(4000));
    });

    it('get fixed price of BTC', async () => {
      await send(priceOracle, '_setExchangeRate', [BTC._address, '0x0000000000000000000000000000000000000000', '36000000000000000000000']);
      const result = await call(priceOracle, 'getUnderlyingPrice', [cBTC._address]);
      expect(result).toEqualNumber(etherMantissa(360000000000000));
    });

    it('get price of rETH', async () => {
      const rETH = await makeToken({
        decimals: 18,
      });
      const cRETH = await makeCToken({
        kind: 'cerc20',
        underlying: rETH,
        comptroller,
      });
      const WETH = await call(cEther, 'underlying', []);
      const aggregator = await makeChainlinkAggregator({
        decimals: 8,
        answer: '400000000000',
      });
      await send(priceOracle, '_setAggregator', [WETH, aggregator._address]);
      await send(priceOracle, '_setExchangeRate', [rETH._address, WETH, '1010000000000000000']);
      const result = await call(priceOracle, 'getUnderlyingPrice', [cRETH._address]);
      expect(result).toEqualNumber(etherMantissa(4040));
    });

    it('get price of BTC2x', async () => {
      const BTC2x = await makeToken({
        decimals: 8,
      });
      const cBTC2x = await makeCToken({
        kind: 'cerc20',
        underlying: BTC2x,
        comptroller,
      });
      const aggregator = await makeChainlinkAggregator({
        decimals: 8,
        answer: '3600000000000',
      });
      await send(priceOracle, '_setAggregator', [BTC._address, aggregator._address]);
      await send(priceOracle, '_setExchangeRate', [BTC2x._address, BTC._address, '2000000000000000000']);
      const result = await call(priceOracle, 'getUnderlyingPrice', [cBTC2x._address]);
      expect(result).toEqualNumber(etherMantissa(720000000000000));
    });
  });

  describe('getTokenPrice', () => {
    let priceOracle, comptroller;

    beforeEach(async () => {
      priceOracle = await makePriceOracle({
        kind: 'proxy',
      });
      comptroller = await makeComptroller({priceOracle});
    });

    it('get token price from chainlink', async () => {
      const underlying = await makeToken({});
      const cToken = await makeCToken({
        kind: 'cerc20',
        underlying,
        comptroller,
      });
      const aggregator = await makeChainlinkAggregator({
        decimals: 8,
        answer: '400000000000',
      });
      await send(priceOracle, '_setAggregator', [underlying._address, aggregator._address]);
      const result = await call(priceOracle, 'getUnderlyingPrice', [cToken._address]);
      expect(result).toEqualNumber(etherMantissa(4000));
    });

    it('get price of BTC from chainlink', async () => {
      const underlying = await makeToken({
        decimals: 8,
      });
      const cToken = await makeCToken({
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
  });
});