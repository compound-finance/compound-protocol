const {
  etherMantissa,
  both,
  call,
  send
} = require('../Utils/MochaTruffle');

const {
  makeComptroller,
  makePriceOracle,
  makeCToken,
  makeToken
} = require('../Utils/Compound');

contract('Comptroller', ([root, ...accounts]) => {
  describe('constructor', () => {
    it("on success it sets admin to creator and pendingAdmin is unset", async () => {
      const comptroller = await makeComptroller();
      assert.equal(root, await call(comptroller, 'admin'));
      assert.equal(0, await call(comptroller, 'pendingAdmin'));
    });

    it("on success it sets closeFactor and maxAssets as specified", async () => {
      const comptroller = await makeComptroller();
      assert.equal(.051e18, await call(comptroller, 'closeFactorMantissa'));
      assert.equal(10, await call(comptroller, 'maxAssets'));
    });

    it("reverts on invalid closeFactor", async () => {
      await assert.revert(makeComptroller({closeFactor: 1}), 'revert set close factor error');
    });

    it("allows small and large maxAssets", async () => {
      const comptroller = await makeComptroller({maxAssets: 0});
      assert.equal(0, await call(comptroller, 'maxAssets'));

      // 5000 is an arbitrary number larger than what we expect to ever actually use
      await send(comptroller, '_setMaxAssets', [5000]);
      assert.equal(5000, await call(comptroller, 'maxAssets'));
    });
  });

  describe('_setLiquidationIncentive', async () => {
    const initialIncentive = etherMantissa(1.0);
    const validIncentive = etherMantissa(1.1);
    const tooSmallIncentive = etherMantissa(0.99999);
    const tooLargeIncentive = etherMantissa(1.50000001);

    let comptroller;
    before(async () => {
      comptroller = await makeComptroller();
    });

    it("fails if called by non-admin", async () => {
      const {reply, receipt} = await both(comptroller, '_setLiquidationIncentive', [initialIncentive], {from: accounts[0]});
      assert.hasTrollError(reply, 'UNAUTHORIZED');
      assert.hasTrollFailure(
        receipt,
        'UNAUTHORIZED',
        'SET_LIQUIDATION_INCENTIVE_OWNER_CHECK'
      );
      assert.equal(await call(comptroller, 'liquidationIncentiveMantissa'), initialIncentive);
    });

    it("fails if incentive is less than min", async () => {
      const {reply, receipt} = await both(comptroller, '_setLiquidationIncentive', [tooSmallIncentive]);
      assert.hasTrollError(reply, 'INVALID_LIQUIDATION_INCENTIVE');
      assert.hasTrollFailure(
        receipt,
        'INVALID_LIQUIDATION_INCENTIVE',
        'SET_LIQUIDATION_INCENTIVE_VALIDATION'
      );
      assert.equal(await call(comptroller, 'liquidationIncentiveMantissa'), initialIncentive);
    });

    it("fails if incentive is greater than max", async () => {
      const {reply, receipt} = await both(comptroller, '_setLiquidationIncentive', [tooLargeIncentive]);
      assert.hasTrollError(reply, 'INVALID_LIQUIDATION_INCENTIVE');
      assert.hasTrollFailure(
        receipt,
        'INVALID_LIQUIDATION_INCENTIVE',
        'SET_LIQUIDATION_INCENTIVE_VALIDATION'
      );
      assert.equal(await call(comptroller, 'liquidationIncentiveMantissa'), initialIncentive);
    });

    it("accepts a valid incentive and emits a NewLiquidationIncentive event", async () => {
      const {reply, receipt} = await both(comptroller, '_setLiquidationIncentive', [validIncentive]);
      assert.hasTrollError(reply, 'NO_ERROR');
      assert.hasLog(receipt, 'NewLiquidationIncentive', {
        oldLiquidationIncentiveMantissa: initialIncentive.toString(),
        newLiquidationIncentiveMantissa: validIncentive.toString()
      });
      assert.equal(await call(comptroller, 'liquidationIncentiveMantissa'), validIncentive);
    });
  });

  describe('_setPriceOracle', async () => {
    let comptroller, oldOracle, newOracle;
    before(async () => {
      comptroller = await makeComptroller();
      oldOracle = comptroller.priceOracle;
      newOracle = await makePriceOracle();
    });

    it("fails if called by non-admin", async () => {
      assert.hasTrollFailure(
        await send(comptroller, '_setPriceOracle', [newOracle._address], {from: accounts[0]}),
        'UNAUTHORIZED',
        'SET_PRICE_ORACLE_OWNER_CHECK'
      );
      assert.equal(await comptroller.methods.oracle().call(), oldOracle._address);
    });

    it.skip("reverts if passed a contract that doesn't implement isPriceOracle", async () => {
      await assert.revert(send(comptroller, '_setPriceOracle', [comptroller._address]));
      assert.equal(await call(comptroller, 'oracle'), oldOracle._address);
    });

    it.skip("reverts if passed a contract that implements isPriceOracle as false", async () => {
      await send(newOracle, 'setIsPriceOracle', [false]); // Note: not yet implemented
      await assert.revert(send(notOracle, '_setPriceOracle', [comptroller._address]), "revert oracle method isPriceOracle returned false");
      assert.equal(await call(comptroller, 'oracle'), oldOracle._address);
    });

    it("accepts a valid price oracle and emits a NewPriceOracle event", async () => {
      const result = await send(comptroller, '_setPriceOracle', [newOracle._address]);
      assert.success(result);
      assert.hasLog(result, 'NewPriceOracle', {
        oldPriceOracle: oldOracle._address,
        newPriceOracle: newOracle._address
      });
      assert.equal(await call(comptroller, 'oracle'), newOracle._address);
    });
  });

  describe('_setCollateralFactor', async () => {
    const half = etherMantissa(0.5), one = etherMantissa(1);

    it("fails if not called by admin", async () => {
      const cToken = await makeCToken();
      assert.hasTrollFailure(
        await send(cToken.comptroller, '_setCollateralFactor', [cToken._address, half], {from: accounts[0]}),
        'UNAUTHORIZED',
        'SET_COLLATERAL_FACTOR_OWNER_CHECK'
      );
    });

    it("fails if asset is not listed", async () => {
      const cToken = await makeCToken();
      assert.hasTrollFailure(
        await send(cToken.comptroller, '_setCollateralFactor', [cToken._address, half]),
        'MARKET_NOT_LISTED',
        'SET_COLLATERAL_FACTOR_NO_EXISTS'
      );
    });

    it("fails if factor is too high", async () => {
      const cToken = await makeCToken({supportMarket: true});
      assert.hasTrollFailure(
        await send(cToken.comptroller, '_setCollateralFactor', [cToken._address, one]),
        'INVALID_COLLATERAL_FACTOR',
        'SET_COLLATERAL_FACTOR_VALIDATION'
      );
    });

    it("fails if factor is set without an underlying price", async () => {
      const cToken = await makeCToken({supportMarket: true});
      assert.hasTrollFailure(
        await send(cToken.comptroller, '_setCollateralFactor', [cToken._address, half]),
        'PRICE_ERROR',
        'SET_COLLATERAL_FACTOR_WITHOUT_PRICE'
      );
    });

    it("succeeds and sets market", async () => {
      const cToken = await makeCToken({supportMarket: true, underlyingPrice: 1});
      const result = await send(cToken.comptroller, '_setCollateralFactor', [cToken._address, half]);
      assert.hasLog(result, 'NewCollateralFactor', {
        cToken: cToken._address,
        oldCollateralFactorMantissa: '0',
        newCollateralFactorMantissa: half.toString()
      });
    });
  });

  describe('_supportMarket', async () => {
    it("fails if not called by admin", async () => {
      const cToken = await makeCToken(root);
      assert.hasTrollFailure(
        await send(cToken.comptroller, '_supportMarket', [cToken._address], {from: accounts[0]}),
        'UNAUTHORIZED',
        'SUPPORT_MARKET_OWNER_CHECK'
      );
    });

    it("fails if asset is not a CToken", async () => {
      const comptroller = await makeComptroller()
      const asset = await makeToken(root);
      await assert.revert(send(comptroller, '_supportMarket', [asset._address]));
    });

    it("succeeds and sets market", async () => {
      const cToken = await makeCToken();
      const result = await send(cToken.comptroller, '_supportMarket', [cToken._address]);
      assert.hasLog(result, 'MarketListed', {cToken: cToken._address});
    });

    it("cannot list a market a second time", async () => {
      const cToken = await makeCToken();
      const result1 = await send(cToken.comptroller, '_supportMarket', [cToken._address]);
      const result2 = await send(cToken.comptroller, '_supportMarket', [cToken._address]);
      assert.hasLog(result1, 'MarketListed', {cToken: cToken._address});
      assert.hasTrollFailure(
        result2,
        'MARKET_ALREADY_LISTED',
        'SUPPORT_MARKET_EXISTS'
      );
    });

    it("can list two different markets", async () => {
      const cToken1 = await makeCToken();
      const cToken2 = await makeCToken({comptroller: cToken1.comptroller});
      const result1 = await send(cToken1.comptroller, '_supportMarket', [cToken1._address]);
      const result2 = await send(cToken1.comptroller, '_supportMarket', [cToken2._address]);
      assert.hasLog(result1, 'MarketListed', {cToken: cToken1._address});
      assert.hasLog(result2, 'MarketListed', {cToken: cToken2._address});
    });
  });

  describe('redeemVerify', async () => {
    it('should allow you to redeem 0 underlying for 0 tokens', async () => {
      const comptroller = await makeComptroller();
      const cToken = await makeCToken({comptroller: comptroller});
      await call(comptroller, 'redeemVerify', [cToken._address, accounts[0], 0, 0]);
    });

    it('should allow you to redeem 5 underlyig for 5 tokens', async () => {
      const comptroller = await makeComptroller();
      const cToken = await makeCToken({comptroller: comptroller});
      await call(comptroller, 'redeemVerify', [cToken._address, accounts[0], 5, 5]);
    });

    it('should not allow you to redeem 5 underlying for 0 tokens', async () => {
      const comptroller = await makeComptroller();
      const cToken = await makeCToken({comptroller: comptroller});
      await assert.revert(call(comptroller, 'redeemVerify', [cToken._address, accounts[0], 5, 0]), "revert redeemTokens zero");
    });
  })
});
