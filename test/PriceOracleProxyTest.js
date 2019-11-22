const BigNumber = require('bignumber.js');

const {
  address,
  etherMantissa,
  getContract,
  call,
  send
} = require('./Utils/MochaTruffle');

const {
  makeCToken,
  makePriceOracle,
} = require('./Utils/Compound');

const OraclePriceOracleProxy = getContract('PriceOracleProxy');

contract('PriceOracleProxy', function([root, ...accounts]) {
  let oracle, backingOracle, cEth, cUsdc, cSai, cDai, cOther;

  before(async () =>{
    cEth = await makeCToken({kind: "cether", comptrollerOpts: {kind: "v1-no-proxy"}, supportMarket: true});
    cUsdc = await makeCToken({comptroller: cEth.comptroller, supportMarket: true});
    cSai = await makeCToken({comptroller: cEth.comptroller, supportMarket: true});
    cDai = await makeCToken({comptroller: cEth.comptroller, supportMarket: true});
    cOther = await makeCToken({comptroller: cEth.comptroller, supportMarket: true});

    backingOracle = await makePriceOracle();
    oracle = await OraclePriceOracleProxy
      .deploy({
        arguments: [
          cEth.comptroller._address,
          backingOracle._address,
          cEth._address,
          cUsdc._address,
          cSai._address,
          cDai._address
        ]})
      .send({from: root});
  });

  describe("constructor", async () => {
    it("sets address of comptroller", async () => {
      let configuredComptroller = await call(oracle, "comptroller");
      assert.equal(configuredComptroller, cEth.comptroller._address);
    });

    it("sets address of v1 oracle", async () => {
      let configuredOracle = await call(oracle, "v1PriceOracle");
      assert.equal(configuredOracle, backingOracle._address);
    });

    it("sets address of cEth", async () => {
      let configuredCEther = await call(oracle, "cEthAddress");
      assert.equal(configuredCEther, cEth._address);
    });

    it("sets address of cUSDC", async () => {
      let configuredCUSD = await call(oracle, "cUsdcAddress");
      assert.equal(configuredCUSD, cUsdc._address);
    });

    it("sets address of cSAI", async () => {
      let configuredCSAI = await call(oracle, "cSaiAddress");
      assert.equal(configuredCSAI, cSai._address);
    });


    it("sets address of cDAI", async () => {
      let configuredCDAI = await call(oracle, "cDaiAddress");
      assert.equal(configuredCDAI, cDai._address);
    });
});

  describe("getUnderlyingPrice", async () => {
    let setAndVerifyBackingPrice = async (cToken, price) => {
      await send(
        backingOracle,
        "setUnderlyingPrice",
        [cToken._address, etherMantissa(price)]);

      let backingOraclePrice = await call(
        backingOracle,
        "assetPrices",
        [cToken.underlying._address]);

      assert.equal(Number(backingOraclePrice), price * 1e18);
    };

    let readAndVerifyProxyPrice = async (token, price) =>{
      let proxyPrice = await call(oracle, "getUnderlyingPrice", [token._address]);
      assert.equal(Number(proxyPrice), price * 1e18);;
    };

    it("always returns 1e18 for cEth", async () => {
      await readAndVerifyProxyPrice(cEth, 1);
    });

    it("proxies to v1 oracle for cusdc", async () => {
      await setAndVerifyBackingPrice(cSai, 50);
      await readAndVerifyProxyPrice(cUsdc, 50e12);
    });

    it("computes address(2) / address(1) * maker usd price for csai and cdai", async () => {
      await setAndVerifyBackingPrice(cSai, 5);

      // 0.95 < ratio < 1.05
      await send(backingOracle, "setDirectPrice", [address(1), etherMantissa(1e12)]);
      await send(backingOracle, "setDirectPrice", [address(2), etherMantissa(1.03)]);
      await readAndVerifyProxyPrice(cSai, 1.03 * 5);
      await readAndVerifyProxyPrice(cDai, 1.03 * 5);

      // ratio <= 0.95
      await send(backingOracle, "setDirectPrice", [address(1), etherMantissa(5e12)]);
      await readAndVerifyProxyPrice(cSai, 0.95 * 5);
      await readAndVerifyProxyPrice(cDai, 0.95 * 5);

      // 1.05 <= ratio
      await send(backingOracle, "setDirectPrice", [address(1), etherMantissa(5e11)]);
      await readAndVerifyProxyPrice(cSai, 1.05 * 5);
      await readAndVerifyProxyPrice(cDai, 1.05 * 5);
    });

    it("proxies for whitelisted tokens", async () => {
      await setAndVerifyBackingPrice(cOther, 11);
      await readAndVerifyProxyPrice(cOther, 11);

      await setAndVerifyBackingPrice(cOther, 37);
      await readAndVerifyProxyPrice(cOther, 37);
    });

    it("returns 0 for non-whitelisted token", async () => {
      let unlistedToken = await makeCToken({comptroller: cEth.comptroller});

      await setAndVerifyBackingPrice(unlistedToken, 12);
      await readAndVerifyProxyPrice(unlistedToken, 0);
    });

    it("returns 0 for wrong comptroller", async () => {
      let wrongNetworkToken = await makeCToken({supportMarket: true});
      await setAndVerifyBackingPrice(wrongNetworkToken, 10);
      await readAndVerifyProxyPrice(wrongNetworkToken, 0);
    });

  });
});
