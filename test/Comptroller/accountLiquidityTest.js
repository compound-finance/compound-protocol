const {call, send} = require('../Utils/MochaTruffle');
const {
  makeComptroller,
  makeCToken,
  enterMarkets,
  quickMint
} = require('../Utils/Compound');

contract('Comptroller', ([root, ...accounts]) => {
  describe('liquidity', () => {
    it("fails if a price has not been set", async () => {
      const cToken = await makeCToken({supportMarket: true});
      await enterMarkets([cToken], accounts[1]);
      assert.hasTrollError(await call(cToken.comptroller, 'getAccountLiquidity', [accounts[1]]), 'PRICE_ERROR');
    });

    it("allows a borrow up to collateralFactor, but not more", async () => {
      const collateralFactor = 0.5, underlyingPrice = 1, user = accounts[1], amount = 1e6;
      const cToken = await makeCToken({supportMarket: true, collateralFactor, underlyingPrice});

      let error, liquidity, shortfall;

      // not in market yet, hypothetical borrow should have no effect
      ({1: liquidity, 2: shortfall} = await call(cToken.comptroller, 'getHypotheticalAccountLiquidity', [user, cToken._address, 0, amount]));
      assert.equal(liquidity, 0);
      assert.equal(shortfall, 0);

      await enterMarkets([cToken], user);
      await quickMint(cToken, user, amount);

      // total account liquidity after supplying `amount`
      ({1: liquidity, 2: shortfall} = await call(cToken.comptroller, 'getAccountLiquidity', [user]));
      assert.equal(liquidity, amount * collateralFactor);
      assert.equal(shortfall, 0);

      // hypothetically borrow `amount`, should shortfall over collateralFactor
      ({1: liquidity, 2: shortfall} = await call(cToken.comptroller, 'getHypotheticalAccountLiquidity', [user, cToken._address, 0, amount]));
      assert.equal(liquidity, 0);
      assert.equal(shortfall, amount * (1 - collateralFactor));

      // hypothetically redeem `amount`, should be back to even
      ({1: liquidity, 2: shortfall} = await call(cToken.comptroller, 'getHypotheticalAccountLiquidity', [user, cToken._address, amount, 0]));
      assert.equal(liquidity, 0);
      assert.equal(shortfall, 0);
    });

    it("allows entering 3 markets, supplying to 2 and borrowing up to collateralFactor in the 3rd", async () => {
      const amount1 = 1e6, amount2 = 1e3, user = accounts[1];
      const cf1 = 0.5, cf2 = 0.666, cf3 = 0, up1 = 3, up2 = 2.718, up3 = 1;
      const c1 = amount1 * cf1 * up1, c2 = amount2 * cf2 * up2, collateral = Math.floor(c1 + c2);
      const cToken1 = await makeCToken({supportMarket: true, collateralFactor: cf1, underlyingPrice: up1});
      const cToken2 = await makeCToken({supportMarket: true, comptroller: cToken1.comptroller, collateralFactor: cf2, underlyingPrice: up2});
      const cToken3 = await makeCToken({supportMarket: true, comptroller: cToken1.comptroller, collateralFactor: cf3, underlyingPrice: up3});

      await enterMarkets([cToken1, cToken2, cToken3], user);
      await quickMint(cToken1, user, amount1);
      await quickMint(cToken2, user, amount2);

      let error, liquidity, shortfall;

      ({0: error, 1: liquidity, 2: shortfall} = await call(cToken3.comptroller, 'getAccountLiquidity', [user]));
      assert.equal(error, 0);
      assert.equal(liquidity, collateral);
      assert.equal(shortfall, 0);

      ({1: liquidity, 2: shortfall} = await call(cToken3.comptroller, 'getHypotheticalAccountLiquidity', [user, cToken3._address, Math.floor(c2), 0]));
      assert.equal(liquidity, collateral);
      assert.equal(shortfall, 0);

      ({1: liquidity, 2: shortfall} = await call(cToken3.comptroller, 'getHypotheticalAccountLiquidity', [user, cToken3._address, 0, Math.floor(c2)]));
      assert.equal(liquidity, c1);
      assert.equal(shortfall, 0);

      ({1: liquidity, 2: shortfall} = await call(cToken3.comptroller, 'getHypotheticalAccountLiquidity', [user, cToken3._address, 0, collateral + c1]));
      assert.equal(liquidity, 0);
      assert.equal(shortfall, c1);

      ({1: liquidity, 2: shortfall} = await call(cToken1.comptroller, 'getHypotheticalAccountLiquidity', [user, cToken1._address, amount1, 0]));
      assert.equal(liquidity, Math.floor(c2));
      assert.equal(shortfall, 0);
    });
  });

  describe("getAccountLiquidity", async () => {
    it("returns 0 if not 'in' any markets", async () => {
      const comptroller = await makeComptroller();
      const {0: error, 1: liquidity, 2: shortfall} = await call(comptroller, 'getAccountLiquidity', [accounts[0]]);
      assert.equal(0, error, "error should be zero");
      assert.equal(0, liquidity, "liquidity should be zero");
      assert.equal(0, shortfall, "shortfall should be zero");
    });
  });

  describe("getHypotheticalAccountLiquidity", async () => {
    it("returns 0 if not 'in' any markets", async () => {
      const cToken = await makeCToken();
      const {0: error, 1: liquidity, 2: shortfall} = await call(cToken.comptroller, 'getHypotheticalAccountLiquidity', [accounts[0], cToken._address, 0, 0]);
      assert.equal(0, error, "error should be zero");
      assert.equal(0, liquidity, "liquidity should be zero");
      assert.equal(0, shortfall, "shortfall should be zero");
    });

    it("returns collateral factor times dollar amount of tokens minted in a single market", async () => {
      const collateralFactor = 0.5, exchangeRate = 1, underlyingPrice = 1;
      const cToken = await makeCToken({supportMarket: true, collateralFactor, exchangeRate, underlyingPrice});
      const from = accounts[0], balance = 1e7, amount = 1e6;
      await enterMarkets([cToken], from);
      await send(cToken.underlying, 'harnessSetBalance', [from, balance], {from});
      await send(cToken.underlying, 'approve', [cToken._address, balance], {from});
      await send(cToken, 'mint', [amount], {from});
      const {0: error, 1: liquidity, 2: shortfall} = await call(cToken.comptroller, 'getHypotheticalAccountLiquidity', [from, cToken._address, 0, 0]);
      assert.equal(0, error, "error should be zero");
      assert.equal(liquidity, amount * collateralFactor * exchangeRate * underlyingPrice, "liquidity should be 5e5");
      assert.equal(shortfall, 0, "shortfall should be zero");
    });
  });
});
