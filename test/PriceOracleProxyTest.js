const BigNumber = require('bignumber.js');

const {
  etherMantissa,
  getContract,
  call,
  send
} = require('./Utils/MochaTruffle');

const {
  makeComptroller,
  makeCToken,
  makePriceOracle,
} = require('./Utils/Compound');

const OraclePriceOracleProxy = getContract('PriceOracleProxy');

contract('PriceOracleProxy', function([root, ...accounts]) {
  let oracle, comptroller, backingOracle, cEther, cErc20;

  before(async () =>{
    cEther = await makeCToken({kind: "cether",
                               comptrollerOpts: { kind: "v1-no-proxy"},
                               supportMarket: true});

    backingOracle = await makePriceOracle();
    oracle = await OraclePriceOracleProxy
      .deploy({
        arguments: [
          cEther.comptroller._address,
          backingOracle._address,
          cEther._address
        ]})
      .send({from: root});
  });

  describe("constructor", async () => {
    it("sets address of comptroller", async () => {
      let configuredComptroller = await call(oracle, "comptroller");
      assert.equal(configuredComptroller, cEther.comptroller._address);
    });

    it("sets address of v1 oracle", async () => {
      let configuredOracle = await call(oracle, "v1PriceOracle");
      assert.equal(configuredOracle, backingOracle._address);
    });

    it("sets address of cEther", async () => {
      let configuredCEther = await call(oracle, "cEtherAddress");
      assert.equal(configuredCEther, cEther._address);
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

    it("always returns 1e18 for cEther", async () => {
      await readAndVerifyProxyPrice(cEther, 1);
    });

    it("proxies to v1 oracle for listed cErc20's", async () => {
      let listedToken = await makeCToken({comptroller: cEther.comptroller, supportMarket: true});

      await setAndVerifyBackingPrice(listedToken, 12);
      await readAndVerifyProxyPrice(listedToken, 12);

      await setAndVerifyBackingPrice(listedToken, 37);
      await readAndVerifyProxyPrice(listedToken, 37);
    });

    describe("returns 0 for unlisted tokens", async () => {
      it("right comptroller, not supported", async () => {
        let unlistedToken = await makeCToken({comptroller: comptroller,
                                              supportMarket: false});

        await setAndVerifyBackingPrice(unlistedToken, 12);
        await readAndVerifyProxyPrice(unlistedToken, 0);
      });

      it("wrong comptroller", async () => {
        let wrongNetworkToken = await makeCToken({supportMarket: true});
        await setAndVerifyBackingPrice(wrongNetworkToken, 10);

        await readAndVerifyProxyPrice(wrongNetworkToken, 0);
      });

      it("not even a cToken", async () => {
        let proxyPrice = await call(oracle, "getUnderlyingPrice", [root]);
        assert.equal(Number(proxyPrice), 0);
      });
    });
  });
});
