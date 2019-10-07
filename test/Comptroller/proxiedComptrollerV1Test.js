const { address, etherMantissa, getContract, getTestContract, call, send } = require('../Utils/MochaTruffle');

const { makeComptroller, makeCToken, makePriceOracle } = require('../Utils/Compound');

const Unitroller = getContract('Unitroller');
const ComptrollerG1 = getContract('ComptrollerG1');

contract('ComptrollerV1', function([root, ...accounts]) {
  let unitroller;
  let brains;
  let oracle;

  before(async () => {
    oracle = await makePriceOracle();
    brains = await ComptrollerG1.deploy().send({ from: root });
  });

  beforeEach(async () => {
    unitroller = await Unitroller.deploy().send({ from: root });
  });

  let initializeBrains = async (priceOracle, closeFactor, maxAssets) => {
    await send(unitroller, '_setPendingImplementation', [brains._address]);
    await send(brains, '_become', [unitroller._address, priceOracle._address, closeFactor, maxAssets, false]);
    return ComptrollerG1.at(unitroller._address);
  };

  let reinitializeBrains = async () => {
    await send(unitroller, '_setPendingImplementation', [brains._address]);
    await send(brains, '_become', [unitroller._address, address(0), 0, 0, true]);
    return ComptrollerG1.at(unitroller._address);
  };

  describe('delegating to comptroller v1', async () => {
    const closeFactor = etherMantissa(0.051),
      maxAssets = 10;

    let unitrollerAsComptroller, cToken;
    beforeEach(async () => {
      unitrollerAsComptroller = await initializeBrains(oracle, etherMantissa(0.06), 30);
      cToken = await makeCToken({ comptroller: unitrollerAsComptroller });
    });

    describe('becoming brains sets initial state', async () => {
      it('reverts if this is not the pending implementation', async () => {
        await assert.revert(
          send(brains, '_become', [unitroller._address, oracle._address, 0, 10, false]),
          'revert change not authorized'
        );
      });

      it('on success it sets admin to caller of constructor', async () => {
        assert.equal(await call(unitrollerAsComptroller, 'admin'), root);
        assert.addressZero(
          await call(unitrollerAsComptroller, 'pendingAdmin'),
          'pendingAdmin should be zero for a new contract'
        );
      });

      it('on success it sets closeFactor and maxAssets as specified', async () => {
        const comptroller = await initializeBrains(oracle, closeFactor, maxAssets);
        assert.equal(await call(comptroller, 'closeFactorMantissa'), closeFactor, 'closeFactor');
        assert.equal(await call(comptroller, 'maxAssets'), maxAssets, 'maxAssets');
      });

      it("on reinitialization success, it doesn't set closeFactor or maxAssets", async () => {
        let comptroller = await initializeBrains(oracle, closeFactor, maxAssets);
        assert.equal(await call(unitroller, 'comptrollerImplementation'), brains._address);
        assert.equal(await call(comptroller, 'closeFactorMantissa'), closeFactor, 'closeFactor');
        assert.equal(await call(comptroller, 'maxAssets'), maxAssets, 'maxAssets');

        // Create new brains
        brains = await ComptrollerG1.deploy().send({ from: root });
        comptroller = await reinitializeBrains();

        assert.equal(await call(unitroller, 'comptrollerImplementation'), brains._address);
        assert.equal(await call(comptroller, 'closeFactorMantissa'), closeFactor, 'closeFactor');
        assert.equal(await call(comptroller, 'maxAssets'), maxAssets, 'maxAssets');
      });

      it('reverts on invalid closeFactor', async () => {
        await send(unitroller, '_setPendingImplementation', [brains._address]);
        await assert.revert(
          send(brains, '_become', [unitroller._address, oracle._address, 0, maxAssets, false]),
          'revert set close factor error'
        );
      });

      it('allows 0 maxAssets', async () => {
        const comptroller = await initializeBrains(oracle, closeFactor, 0);
        assert.equal(await call(comptroller, 'maxAssets'), 0, 'maxAssets');
      });

      it('allows 5000 maxAssets', async () => {
        // 5000 is an arbitrary number larger than what we expect to ever actually use
        const comptroller = await initializeBrains(oracle, closeFactor, 5000);
        assert.equal(await call(comptroller, 'maxAssets'), 5000, 'maxAssets');
      });
    });

    describe('_setCollateralFactor', async () => {
      const half = etherMantissa(0.5),
        one = etherMantissa(1);

      it('fails if not called by admin', async () => {
        assert.hasTrollFailure(
          await send(unitrollerAsComptroller, '_setCollateralFactor', [cToken._address, half], {
            from: accounts[1]
          }),
          'UNAUTHORIZED',
          'SET_COLLATERAL_FACTOR_OWNER_CHECK'
        );
      });

      it('fails if asset is not listed', async () => {
        assert.hasTrollFailure(
          await send(unitrollerAsComptroller, '_setCollateralFactor', [cToken._address, half]),
          'MARKET_NOT_LISTED',
          'SET_COLLATERAL_FACTOR_NO_EXISTS'
        );
      });

      it('fails if factor is too high', async () => {
        const cToken = await makeCToken({ supportMarket: true, comptroller: unitrollerAsComptroller });
        assert.hasTrollFailure(
          await send(unitrollerAsComptroller, '_setCollateralFactor', [cToken._address, one]),
          'INVALID_COLLATERAL_FACTOR',
          'SET_COLLATERAL_FACTOR_VALIDATION'
        );
      });

      it('fails if factor is set without an underlying price', async () => {
        const cToken = await makeCToken({ supportMarket: true, comptroller: unitrollerAsComptroller });
        assert.hasTrollFailure(
          await send(unitrollerAsComptroller, '_setCollateralFactor', [cToken._address, half]),
          'PRICE_ERROR',
          'SET_COLLATERAL_FACTOR_WITHOUT_PRICE'
        );
      });

      it('succeeds and sets market', async () => {
        const cToken = await makeCToken({ supportMarket: true, comptroller: unitrollerAsComptroller });
        await send(oracle, 'setUnderlyingPrice', [cToken._address, 1]);
        assert.hasLog(
          await send(unitrollerAsComptroller, '_setCollateralFactor', [cToken._address, half]),
          'NewCollateralFactor',
          {
            cToken: cToken._address,
            oldCollateralFactorMantissa: '0',
            newCollateralFactorMantissa: half.toString()
          }
        );
      });
    });

    describe('_supportMarket', async () => {
      it('fails if not called by admin', async () => {
        assert.hasTrollFailure(
          await send(unitrollerAsComptroller, '_supportMarket', [cToken._address], { from: accounts[1] }),
          'UNAUTHORIZED',
          'SUPPORT_MARKET_OWNER_CHECK'
        );
      });

      it('fails if asset is not a CToken', async () => {
        const notACToken = await makePriceOracle();
        await assert.revert(send(unitrollerAsComptroller, '_supportMarket', [notACToken._address]));
      });

      it('succeeds and sets market', async () => {
        const result = await send(unitrollerAsComptroller, '_supportMarket', [cToken._address]);
        assert.hasLog(result, 'MarketListed', { cToken: cToken._address });
      });

      it('cannot list a market a second time', async () => {
        const result1 = await send(unitrollerAsComptroller, '_supportMarket', [cToken._address]);
        const result2 = await send(unitrollerAsComptroller, '_supportMarket', [cToken._address]);
        assert.hasLog(result1, 'MarketListed', { cToken: cToken._address });
        assert.hasTrollFailure(result2, 'MARKET_ALREADY_LISTED', 'SUPPORT_MARKET_EXISTS');
      });

      it('can list two different markets', async () => {
        const cToken1 = await makeCToken({ comptroller: unitroller });
        const cToken2 = await makeCToken({ comptroller: unitroller });
        const result1 = await send(unitrollerAsComptroller, '_supportMarket', [cToken1._address]);
        const result2 = await send(unitrollerAsComptroller, '_supportMarket', [cToken2._address]);
        assert.hasLog(result1, 'MarketListed', { cToken: cToken1._address });
        assert.hasLog(result2, 'MarketListed', { cToken: cToken2._address });
      });
    });
  });
});
