const {
  etherUnsigned,
  etherMantissa,
  both,
  etherExp
} = require('../Utils/Ethereum');

const {fastForward, makeCToken, getBalances, adjustBalances} = require('../Utils/Compound');

const factor = etherMantissa(.02);

const reserves = etherUnsigned(3e12);
const cash = etherUnsigned(reserves.multipliedBy(2));
const reduction = etherUnsigned(2e12);

describe('CToken', function () {
  let root, accounts;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe('_setReserveFactorFresh', () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
    });

    it("rejects change by non-admin", async () => {
      await expect(
        send(cToken, 'harnessSetReserveFactorFresh', [factor], {from: accounts[0]})
      ).rejects.toRevertWithCustomError('SetReserveFactorAdminCheck');
      expect(await call(cToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it("rejects change if market not fresh", async () => {
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      await expect(send(cToken, 'harnessSetReserveFactorFresh', [factor])).rejects.toRevertWithCustomError('SetReserveFactorFreshCheck');
      expect(await call(cToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it("rejects newReserveFactor that descales to 1", async () => {
      await expect(send(cToken, 'harnessSetReserveFactorFresh', [etherMantissa(1.01)])).rejects.toRevertWithCustomError('SetReserveFactorBoundsCheck');
      expect(await call(cToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it("accepts newReserveFactor in valid range and emits log", async () => {
      const result = await send(cToken, 'harnessSetReserveFactorFresh', [factor])
      expect(result).toSucceed();
      expect(await call(cToken, 'reserveFactorMantissa')).toEqualNumber(factor);
      expect(result).toHaveLog("NewReserveFactor", {
        oldReserveFactorMantissa: '0',
        newReserveFactorMantissa: factor.toString(),
      });
    });

    it("accepts a change back to zero", async () => {
      const result1 = await send(cToken, 'harnessSetReserveFactorFresh', [factor]);
      const result2 = await send(cToken, 'harnessSetReserveFactorFresh', [0]);
      expect(result1).toSucceed();
      expect(result2).toSucceed();
      expect(result2).toHaveLog("NewReserveFactor", {
        oldReserveFactorMantissa: factor.toString(),
        newReserveFactorMantissa: '0',
      });
      expect(await call(cToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });
  });

  describe('_setReserveFactor', () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
    });

    beforeEach(async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
      await send(cToken, '_setReserveFactor', [0]);
    });

    it("emits a reserve factor failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await fastForward(cToken, 1);
      await expect(send(cToken, '_setReserveFactor', [factor])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      expect(await call(cToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it("returns error from setReserveFactorFresh without emitting any extra logs", async () => {
      await expect(send(cToken, '_setReserveFactor', [etherMantissa(2)])).rejects.toRevert();
      expect(await call(cToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it("returns success from setReserveFactorFresh", async () => {
      expect(await call(cToken, 'reserveFactorMantissa')).toEqualNumber(0);
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(cToken, '_setReserveFactor', [factor])).toSucceed();
      expect(await call(cToken, 'reserveFactorMantissa')).toEqualNumber(factor);
    });
  });

  describe("_reduceReservesFresh", () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
      expect(await send(cToken, 'harnessSetTotalReserves', [reserves])).toSucceed();
      expect(
        await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cash])
      ).toSucceed();
    });

    it("fails if called by non-admin", async () => {
      await expect(
        send(cToken, 'harnessReduceReservesFresh', [reduction], {from: accounts[0]})
      ).rejects.toRevertWithCustomError('ReduceReservesAdminCheck');
      expect(await call(cToken, 'totalReserves')).toEqualNumber(reserves);
    });

    it("fails if market not fresh", async () => {
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      await expect(send(cToken, 'harnessReduceReservesFresh', [reduction])).rejects.toRevertWithCustomError('ReduceReservesFreshCheck');
      expect(await call(cToken, 'totalReserves')).toEqualNumber(reserves);
    });

    it("fails if amount exceeds reserves", async () => {
      await expect(send(cToken, 'harnessReduceReservesFresh', [reserves.plus(1)])).rejects.toRevertWithCustomError('ReduceReservesCashValidation');
      expect(await call(cToken, 'totalReserves')).toEqualNumber(reserves);
    });

    it("fails if amount exceeds available cash", async () => {
      const cashLessThanReserves = reserves.minus(2);
      await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cashLessThanReserves]);
      await expect(send(cToken, 'harnessReduceReservesFresh', [reserves])).rejects.toRevertWithCustomError('ReduceReservesCashNotAvailable');
      expect(await call(cToken, 'totalReserves')).toEqualNumber(reserves);
    });

    it("increases admin balance and reduces reserves on success", async () => {
      const balance = etherUnsigned(await call(cToken.underlying, 'balanceOf', [root]));
      expect(await send(cToken, 'harnessReduceReservesFresh', [reserves])).toSucceed();
      expect(await call(cToken.underlying, 'balanceOf', [root])).toEqualNumber(balance.plus(reserves));
      expect(await call(cToken, 'totalReserves')).toEqualNumber(0);
    });

    it("emits an event on success", async () => {
      const result = await send(cToken, 'harnessReduceReservesFresh', [reserves]);
      expect(result).toHaveLog('ReservesReduced', {
        admin: root,
        reduceAmount: reserves.toString(),
        newTotalReserves: '0'
      });
    });
  });

  describe("_reduceReserves", () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
      expect(await send(cToken, 'harnessSetTotalReserves', [reserves])).toSucceed();
      expect(
        await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cash])
      ).toSucceed();
    });

    it("emits a reserve-reduction failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await fastForward(cToken, 1);
      await expect(send(cToken, '_reduceReserves', [reduction])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from _reduceReservesFresh without emitting any extra logs", async () => {
      await expect(send(cToken, 'harnessReduceReservesFresh', [reserves.plus(1)])).rejects.toRevert();
    });

    it("returns success code from _reduceReservesFresh and reduces the correct amount", async () => {
      expect(await call(cToken, 'totalReserves')).toEqualNumber(reserves);
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(cToken, '_reduceReserves', [reduction])).toSucceed();
    });
  });

  describe("CEther addReserves", () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken({kind: 'cether'});
    });

    it("add reserves for CEther", async () => {
      const balanceBefore = await getBalances([cToken], [])
      const reservedAdded = etherExp(1);
      const result = await send(cToken, "_addReserves", {value: reservedAdded}); //assert no erro
      expect(result).toSucceed();
      expect(result).toHaveLog('ReservesAdded', {
        benefactor: root,
        addAmount: reservedAdded.toString(),
        newTotalReserves: reservedAdded.toString()
      });
      const balanceAfter = await getBalances([cToken], []);
      expect(balanceAfter).toEqual(await adjustBalances(balanceBefore, [
        [cToken, cToken._address, 'eth', reservedAdded],
        [cToken, cToken._address, 'reserves', reservedAdded]
      ]));
    });
  });
});
