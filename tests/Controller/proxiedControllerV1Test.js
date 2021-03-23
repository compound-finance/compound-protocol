const { address, etherMantissa } = require('../Utils/Ethereum');

const { makeController, makeVToken, makePriceOracle } = require('../Utils/Vortex');

describe('ControllerV1', function() {
  let root, accounts;
  let unitroller;
  let brains;
  let oracle;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    oracle = await makePriceOracle();
    brains = await deploy('ControllerG1');
    unitroller = await deploy('Unitroller');
  });

  let initializeBrains = async (priceOracle, closeFactor, maxAssets) => {
    await send(unitroller, '_setPendingImplementation', [brains._address]);
    await send(brains, '_become', [unitroller._address, priceOracle._address, closeFactor, maxAssets, false]);
    return await saddle.getContractAt('ControllerG1', unitroller._address);
  };

  let reinitializeBrains = async () => {
    await send(unitroller, '_setPendingImplementation', [brains._address]);
    await send(brains, '_become', [unitroller._address, address(0), 0, 0, true]);
    return await saddle.getContractAt('ControllerG1', unitroller._address);
  };

  describe('delegating to controller v1', () => {
    const closeFactor = etherMantissa(0.051);
    const maxAssets = 10;
    let unitrollerAsController, vToken;

    beforeEach(async () => {
      unitrollerAsController = await initializeBrains(oracle, etherMantissa(0.06), 30);
      vToken = await makeVToken({ controller: unitrollerAsController });
    });

    describe('becoming brains sets initial state', () => {
      it('reverts if this is not the pending implementation', async () => {
        await expect(
          send(brains, '_become', [unitroller._address, oracle._address, 0, 10, false])
        ).rejects.toRevert('revert change not authorized');
      });

      it('on success it sets admin to caller of constructor', async () => {
        expect(await call(unitrollerAsController, 'admin')).toEqual(root);
        expect(await call(unitrollerAsController, 'pendingAdmin')).toBeAddressZero();
      });

      it('on success it sets closeFactor and maxAssets as specified', async () => {
        const controller = await initializeBrains(oracle, closeFactor, maxAssets);
        expect(await call(controller, 'closeFactorMantissa')).toEqualNumber(closeFactor);
        expect(await call(controller, 'maxAssets')).toEqualNumber(maxAssets);
      });

      it("on reinitialization success, it doesn't set closeFactor or maxAssets", async () => {
        let controller = await initializeBrains(oracle, closeFactor, maxAssets);
        expect(await call(unitroller, 'controllerImplementation')).toEqual(brains._address);
        expect(await call(controller, 'closeFactorMantissa')).toEqualNumber(closeFactor);
        expect(await call(controller, 'maxAssets')).toEqualNumber(maxAssets);

        // Create new brains
        brains = await deploy('ControllerG1');
        controller = await reinitializeBrains();

        expect(await call(unitroller, 'controllerImplementation')).toEqual(brains._address);
        expect(await call(controller, 'closeFactorMantissa')).toEqualNumber(closeFactor);
        expect(await call(controller, 'maxAssets')).toEqualNumber(maxAssets);
      });

      it('reverts on invalid closeFactor', async () => {
        await send(unitroller, '_setPendingImplementation', [brains._address]);
        await expect(
          send(brains, '_become', [unitroller._address, oracle._address, 0, maxAssets, false])
        ).rejects.toRevert('revert set close factor error');
      });

      it('allows 0 maxAssets', async () => {
        const controller = await initializeBrains(oracle, closeFactor, 0);
        expect(await call(controller, 'maxAssets')).toEqualNumber(0);
      });

      it('allows 5000 maxAssets', async () => {
        // 5000 is an arbitrary number larger than what we expect to ever actually use
        const controller = await initializeBrains(oracle, closeFactor, 5000);
        expect(await call(controller, 'maxAssets')).toEqualNumber(5000);
      });
    });

    describe('_setCollateralFactor', () => {
      const half = etherMantissa(0.5),
        one = etherMantissa(1);

      it('fails if not called by admin', async () => {
        expect(
          await send(unitrollerAsController, '_setCollateralFactor', [vToken._address, half], {
            from: accounts[1]
          })
        ).toHaveTrollFailure('UNAUTHORIZED', 'SET_COLLATERAL_FACTOR_OWNER_CHECK');
      });

      it('fails if asset is not listed', async () => {
        expect(
          await send(unitrollerAsController, '_setCollateralFactor', [vToken._address, half])
        ).toHaveTrollFailure('MARKET_NOT_LISTED', 'SET_COLLATERAL_FACTOR_NO_EXISTS');
      });

      it('fails if factor is too high', async () => {
        const vToken = await makeVToken({ supportMarket: true, controller: unitrollerAsController });
        expect(
          await send(unitrollerAsController, '_setCollateralFactor', [vToken._address, one])
        ).toHaveTrollFailure('INVALID_COLLATERAL_FACTOR', 'SET_COLLATERAL_FACTOR_VALIDATION');
      });

      it('fails if factor is set without an underlying price', async () => {
        const vToken = await makeVToken({ supportMarket: true, controller: unitrollerAsController });
        expect(
          await send(unitrollerAsController, '_setCollateralFactor', [vToken._address, half])
        ).toHaveTrollFailure('PRICE_ERROR', 'SET_COLLATERAL_FACTOR_WITHOUT_PRICE');
      });

      it('succeeds and sets market', async () => {
        const vToken = await makeVToken({ supportMarket: true, controller: unitrollerAsController });
        await send(oracle, 'setUnderlyingPrice', [vToken._address, 1]);
        expect(
          await send(unitrollerAsController, '_setCollateralFactor', [vToken._address, half])
        ).toHaveLog('NewCollateralFactor', {
          vToken: vToken._address,
          oldCollateralFactorMantissa: '0',
          newCollateralFactorMantissa: half.toString()
        });
      });
    });

    describe('_supportMarket', () => {
      it('fails if not called by admin', async () => {
        expect(
          await send(unitrollerAsController, '_supportMarket', [vToken._address], { from: accounts[1] })
        ).toHaveTrollFailure('UNAUTHORIZED', 'SUPPORT_MARKET_OWNER_CHECK');
      });

      it('fails if asset is not a VToken', async () => {
        const notAVToken = await makePriceOracle();
        await expect(send(unitrollerAsController, '_supportMarket', [notAVToken._address])).rejects.toRevert();
      });

      it('succeeds and sets market', async () => {
        const result = await send(unitrollerAsController, '_supportMarket', [vToken._address]);
        expect(result).toHaveLog('MarketListed', { vToken: vToken._address });
      });

      it('cannot list a market a second time', async () => {
        const result1 = await send(unitrollerAsController, '_supportMarket', [vToken._address]);
        const result2 = await send(unitrollerAsController, '_supportMarket', [vToken._address]);
        expect(result1).toHaveLog('MarketListed', { vToken: vToken._address });
        expect(result2).toHaveTrollFailure('MARKET_ALREADY_LISTED', 'SUPPORT_MARKET_EXISTS');
      });

      it('can list two different markets', async () => {
        const vToken1 = await makeVToken({ controller: unitroller });
        const vToken2 = await makeVToken({ controller: unitroller });
        const result1 = await send(unitrollerAsController, '_supportMarket', [vToken1._address]);
        const result2 = await send(unitrollerAsController, '_supportMarket', [vToken2._address]);
        expect(result1).toHaveLog('MarketListed', { vToken: vToken1._address });
        expect(result2).toHaveLog('MarketListed', { vToken: vToken2._address });
      });
    });
  });
});
