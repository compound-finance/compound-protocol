const {
  makeController,
  makeVToken,
  enterMarkets,
  quickMint
} = require('../Utils/Vortex');

describe('Controller', () => {
  let root, accounts;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe('liquidity', () => {
    it("fails if a price has not been set", async () => {
      const vToken = await makeVToken({supportMarket: true});
      await enterMarkets([vToken], accounts[1]);
      let result = await call(vToken.controller, 'getAccountLiquidity', [accounts[1]]);
      expect(result).toHaveTrollError('PRICE_ERROR');
    });

    it("allows a borrow up to collateralFactor, but not more", async () => {
      const collateralFactor = 0.5, underlyingPrice = 1, user = accounts[1], amount = 1e6;
      const vToken = await makeVToken({supportMarket: true, collateralFactor, underlyingPrice});

      let error, liquidity, shortfall;

      // not in market yet, hypothetical borrow should have no effect
      ({1: liquidity, 2: shortfall} = await call(vToken.controller, 'getHypotheticalAccountLiquidity', [user, vToken._address, 0, amount]));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(0);

      await enterMarkets([vToken], user);
      await quickMint(vToken, user, amount);

      // total account liquidity after supplying `amount`
      ({1: liquidity, 2: shortfall} = await call(vToken.controller, 'getAccountLiquidity', [user]));
      expect(liquidity).toEqualNumber(amount * collateralFactor);
      expect(shortfall).toEqualNumber(0);

      // hypothetically borrow `amount`, should shortfall over collateralFactor
      ({1: liquidity, 2: shortfall} = await call(vToken.controller, 'getHypotheticalAccountLiquidity', [user, vToken._address, 0, amount]));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(amount * (1 - collateralFactor));

      // hypothetically redeem `amount`, should be back to even
      ({1: liquidity, 2: shortfall} = await call(vToken.controller, 'getHypotheticalAccountLiquidity', [user, vToken._address, amount, 0]));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(0);
    }, 20000);

    it("allows entering 3 markets, supplying to 2 and borrowing up to collateralFactor in the 3rd", async () => {
      const amount1 = 1e6, amount2 = 1e3, user = accounts[1];
      const cf1 = 0.5, cf2 = 0.666, cf3 = 0, up1 = 3, up2 = 2.718, up3 = 1;
      const c1 = amount1 * cf1 * up1, c2 = amount2 * cf2 * up2, collateral = Math.floor(c1 + c2);
      const vToken1 = await makeVToken({supportMarket: true, collateralFactor: cf1, underlyingPrice: up1});
      const vToken2 = await makeVToken({supportMarket: true, controller: vToken1.controller, collateralFactor: cf2, underlyingPrice: up2});
      const vToken3 = await makeVToken({supportMarket: true, controller: vToken1.controller, collateralFactor: cf3, underlyingPrice: up3});

      await enterMarkets([vToken1, vToken2, vToken3], user);
      await quickMint(vToken1, user, amount1);
      await quickMint(vToken2, user, amount2);

      let error, liquidity, shortfall;

      ({0: error, 1: liquidity, 2: shortfall} = await call(vToken3.controller, 'getAccountLiquidity', [user]));
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(collateral);
      expect(shortfall).toEqualNumber(0);

      ({1: liquidity, 2: shortfall} = await call(vToken3.controller, 'getHypotheticalAccountLiquidity', [user, vToken3._address, Math.floor(c2), 0]));
      expect(liquidity).toEqualNumber(collateral);
      expect(shortfall).toEqualNumber(0);

      ({1: liquidity, 2: shortfall} = await call(vToken3.controller, 'getHypotheticalAccountLiquidity', [user, vToken3._address, 0, Math.floor(c2)]));
      expect(liquidity).toEqualNumber(c1);
      expect(shortfall).toEqualNumber(0);

      ({1: liquidity, 2: shortfall} = await call(vToken3.controller, 'getHypotheticalAccountLiquidity', [user, vToken3._address, 0, collateral + c1]));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(c1);

      ({1: liquidity, 2: shortfall} = await call(vToken1.controller, 'getHypotheticalAccountLiquidity', [user, vToken1._address, amount1, 0]));
      expect(liquidity).toEqualNumber(Math.floor(c2));
      expect(shortfall).toEqualNumber(0);
    });
  });

  describe("getAccountLiquidity", () => {
    it("returns 0 if not 'in' any markets", async () => {
      const controller = await makeController();
      const {0: error, 1: liquidity, 2: shortfall} = await call(controller, 'getAccountLiquidity', [accounts[0]]);
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(0);
    });
  });

  describe("getHypotheticalAccountLiquidity", () => {
    it("returns 0 if not 'in' any markets", async () => {
      const vToken = await makeVToken();
      const {0: error, 1: liquidity, 2: shortfall} = await call(vToken.controller, 'getHypotheticalAccountLiquidity', [accounts[0], vToken._address, 0, 0]);
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(0);
    });

    it("returns collateral factor times dollar amount of tokens minted in a single market", async () => {
      const collateralFactor = 0.5, exchangeRate = 1, underlyingPrice = 1;
      const vToken = await makeVToken({supportMarket: true, collateralFactor, exchangeRate, underlyingPrice});
      const from = accounts[0], balance = 1e7, amount = 1e6;
      await enterMarkets([vToken], from);
      await send(vToken.underlying, 'harnessSetBalance', [from, balance], {from});
      await send(vToken.underlying, 'approve', [vToken._address, balance], {from});
      await send(vToken, 'mint', [amount], {from});
      const {0: error, 1: liquidity, 2: shortfall} = await call(vToken.controller, 'getHypotheticalAccountLiquidity', [from, vToken._address, 0, 0]);
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(amount * collateralFactor * exchangeRate * underlyingPrice);
      expect(shortfall).toEqualNumber(0);
    });
  });
});
