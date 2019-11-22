const {
  etherUnsigned,
  etherMantissa,
  both,
  call,
  send
} = require('../Utils/MochaTruffle');

const {makeCToken} = require('../Utils/Compound');

const factor = etherMantissa(.02);

const reserves = etherUnsigned(3e12);
const cash = etherUnsigned(reserves.mul(2));
const reduction = etherUnsigned(2e12);

contract('CToken', function ([root, ...accounts]) {
  describe('_setReserveFactorFresh', async () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
    });

    it("rejects change by non-admin", async () => {
      assert.hasTokenFailure(
        await send(cToken, 'harnessSetReserveFactorFresh', [factor], {from: accounts[0]}),
        'UNAUTHORIZED',
        'SET_RESERVE_FACTOR_ADMIN_CHECK'
      );
      assert.equal(await call(cToken, 'reserveFactorMantissa'), 0, "reserve factor should still be 0");
    });

    it("rejects change if market not fresh", async () => {
      assert.success(await send(cToken, 'harnessFastForward', [5]));
      assert.hasTokenFailure(
        await send(cToken, 'harnessSetReserveFactorFresh', [factor]),
        'MARKET_NOT_FRESH',
        'SET_RESERVE_FACTOR_FRESH_CHECK'
      );
      assert.equal(await call(cToken, 'reserveFactorMantissa'), 0, "reserve factor should still be 0");
    });

    it("rejects newReserveFactor that descales to 1", async () => {
      assert.hasTokenFailure(
        await send(cToken, 'harnessSetReserveFactorFresh', [etherMantissa(1.01)]),
        'BAD_INPUT',
        'SET_RESERVE_FACTOR_BOUNDS_CHECK'
      );
      assert.equal(await call(cToken, 'reserveFactorMantissa'), 0, "reserve factor should still be 0");
    });

    it("accepts newReserveFactor in valid range and emits log", async () => {
      const result = await send(cToken, 'harnessSetReserveFactorFresh', [factor])
      assert.success(result);
      assert.equal(await call(cToken, 'reserveFactorMantissa'), factor, "reserve factor should be updated");
      assert.hasLog(result, "NewReserveFactor", {
        oldReserveFactorMantissa: '0',
        newReserveFactorMantissa: factor.toString(),
      });
    });

    it("accepts a change back to zero", async () => {
      const result1 = await send(cToken, 'harnessSetReserveFactorFresh', [factor]);
      const result2 = await send(cToken, 'harnessSetReserveFactorFresh', [0]);
      assert.success(result1);
      assert.success(result2);
      assert.hasLog(result2, "NewReserveFactor", {
        oldReserveFactorMantissa: factor.toString(),
        newReserveFactorMantissa: '0',
      });
      assert.equal(await call(cToken, 'reserveFactorMantissa'), 0, "reserve factor should still be 0");
    });
  });

  describe('_setReserveFactor', async () => {
    let cToken;
    before(async () => {
      cToken = await makeCToken();
    });

    beforeEach(async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
      await send(cToken, '_setReserveFactor', [0]);
    });

    it("emits a reserve factor failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(send(cToken, '_setReserveFactor', [factor]), "revert INTEREST_RATE_MODEL_ERROR");
      assert.equal(await call(cToken, 'reserveFactorMantissa'), 0, "reserve factor should be 0");
    });

    it("returns error from setReserveFactorFresh without emitting any extra logs", async () => {
      const {reply, receipt} = await both(cToken, '_setReserveFactor', [etherMantissa(2)]);
      assert.hasError(reply, 'BAD_INPUT');
      assert.hasTokenFailure(
        receipt,
        'BAD_INPUT',
        'SET_RESERVE_FACTOR_BOUNDS_CHECK'
      );
      assert.equal(await call(cToken, 'reserveFactorMantissa'), 0, "reserve factor should be 0");
    });

    it("returns success from setReserveFactorFresh", async () => {
      assert.equal(await call(cToken, 'reserveFactorMantissa'), 0, "reserve factor begin as 0");
      assert.success(await send(cToken, 'harnessFastForward', [5]));
      await assert.succeeds(cToken, '_setReserveFactor', [factor]);
      assert.equal(await call(cToken, 'reserveFactorMantissa'), factor, "reserve factor should be updated");
    });
  });

  describe("_reduceReservesFresh", async () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
      assert.success(await send(cToken, 'harnessSetTotalReserves', [reserves]));
      assert.success(await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cash]));
    });

    it("fails if called by non-admin", async () => {
      assert.hasTokenFailure(
        await send(cToken, 'harnessReduceReservesFresh', [reduction], {from: accounts[0]}),
        'UNAUTHORIZED',
        'REDUCE_RESERVES_ADMIN_CHECK'
      );
      assert.equal(await call(cToken, 'totalReserves'), reserves, "reserves should not have changed");
    });

    it("fails if market not fresh", async () => {
      assert.success(await send(cToken, 'harnessFastForward', [5]));
      assert.hasTokenFailure(
        await send(cToken, 'harnessReduceReservesFresh', [reduction]),
        'MARKET_NOT_FRESH',
        'REDUCE_RESERVES_FRESH_CHECK'
      );
      assert.equal(await call(cToken, 'totalReserves'), reserves, "reserves should not have changed");
    });

    it("fails if amount exceeds reserves", async () => {
      assert.hasTokenFailure(
        await send(cToken, 'harnessReduceReservesFresh', [reserves.add(1)]),
        'BAD_INPUT',
        'REDUCE_RESERVES_VALIDATION'
      );
      assert.equal(await call(cToken, 'totalReserves'), reserves, "reserves should not have changed");
    });

    it("fails if amount exceeds available cash", async () => {
      const cashLessThanReserves = reserves.sub(2);
      await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cashLessThanReserves]);
      assert.hasTokenFailure(
        await send(cToken, 'harnessReduceReservesFresh', [reserves]),
        'TOKEN_INSUFFICIENT_CASH',
        'REDUCE_RESERVES_CASH_NOT_AVAILABLE'
      );
      assert.equal(await call(cToken, 'totalReserves'), reserves, "reserves should not have changed");
    });

    it("increases admin balance and reduces reserves on success", async () => {
      const balance = etherUnsigned(await call(cToken.underlying, 'balanceOf', [root]));
      assert.success(await send(cToken, 'harnessReduceReservesFresh', [reserves]));
      assert.equal(await call(cToken.underlying, 'balanceOf', [root]), balance.add(reserves), "admin balance should have increased");
      assert.equal(await call(cToken, 'totalReserves'), 0, "reserves should have decreased");
    });

    it("emits an event on success", async () => {
      const result = await send(cToken, 'harnessReduceReservesFresh', [reserves]);
      assert.hasLog(result, 'ReservesReduced', {
        admin: root,
        reduceAmount: reserves.toString(),
        newTotalReserves: '0'
      });
    });
  });

  describe("_reduceReserves", async () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
      assert.success(await send(cToken, 'harnessSetTotalReserves', [reserves]));
      assert.success(await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cash]));
    });

    it("emits a reserve-reduction failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(send(cToken, '_reduceReserves', [reduction]), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from _reduceReservesFresh without emitting any extra logs", async () => {
      const {reply, receipt} = await both(cToken, 'harnessReduceReservesFresh', [reserves.add(1)]);
      assert.hasTokenError(reply, 'BAD_INPUT');
      assert.hasTokenFailure(receipt, 'BAD_INPUT', 'REDUCE_RESERVES_VALIDATION');
    });

    it("returns success code from _reduceReservesFresh and reduces the correct amount", async () => {
      assert.equal(await call(cToken, 'totalReserves'), reserves);
      assert.success(await send(cToken, 'harnessFastForward', [5]));
      await assert.succeeds(cToken, '_reduceReserves', [reduction]);
    });
  });
});