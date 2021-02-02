const {
  etherUnsigned,
  etherMantissa,
  both
} = require('../Utils/Ethereum');

const {fastForward, makeCToken} = require('../Utils/Compound');

const factor = etherMantissa(.02);

const adminFees = etherUnsigned(3e12);
const cash = etherUnsigned(adminFees.mul(2));
const reduction = etherUnsigned(2e12);

describe('CToken', function () {
  let root, accounts;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe('_setAdminFeeFresh', () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
    });

    it("rejects change by non-admin", async () => {
      expect(
        await send(cToken, 'harnessSetAdminFeeFresh', [factor], {from: accounts[0]})
      ).toHaveTokenFailure('UNAUTHORIZED', 'SET_ADMIN_FEE_ADMIN_CHECK');
      expect(await call(cToken, 'adminFeeMantissa')).toEqualNumber(0);
    });

    it("rejects change if market not fresh", async () => {
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(cToken, 'harnessSetAdminFeeFresh', [factor])).toHaveTokenFailure('MARKET_NOT_FRESH', 'SET_ADMIN_FEE_FRESH_CHECK');
      expect(await call(cToken, 'adminFeeMantissa')).toEqualNumber(0);
    });

    it("rejects newAdminFee that descales to 1", async () => {
      expect(await send(cToken, 'harnessSetAdminFeeFresh', [etherMantissa(1.01)])).toHaveTokenFailure('BAD_INPUT', 'SET_ADMIN_FEE_BOUNDS_CHECK');
      expect(await call(cToken, 'adminFeeMantissa')).toEqualNumber(0);
    });

    it("accepts newAdminFee in valid range and emits log", async () => {
      const result = await send(cToken, 'harnessSetAdminFeeFresh', [factor])
      expect(result).toSucceed();
      expect(await call(cToken, 'adminFeeMantissa')).toEqualNumber(factor);
      expect(result).toHaveLog("NewAdminFee", {
        oldAdminFeeMantissa: '0',
        newAdminFeeMantissa: factor.toString(),
      });
    });

    it("accepts a change back to zero", async () => {
      const result1 = await send(cToken, 'harnessSetAdminFeeFresh', [factor]);
      const result2 = await send(cToken, 'harnessSetAdminFeeFresh', [0]);
      expect(result1).toSucceed();
      expect(result2).toSucceed();
      expect(result2).toHaveLog("NewAdminFee", {
        oldAdminFeeMantissa: factor.toString(),
        newAdminFeeMantissa: '0',
      });
      expect(await call(cToken, 'adminFeeMantissa')).toEqualNumber(0);
    });
  });

  describe('_setAdminFee', () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
    });

    beforeEach(async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
      await send(cToken, '_setAdminFee', [0]);
    });

    it("emits an admin fee failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await fastForward(cToken, 1);
      await expect(send(cToken, '_setAdminFee', [factor])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      expect(await call(cToken, 'adminFeeMantissa')).toEqualNumber(0);
    });

    it("returns error from setAdminFeeFresh without emitting any extra logs", async () => {
      const {reply, receipt} = await both(cToken, '_setAdminFee', [etherMantissa(2)]);
      expect(reply).toHaveTokenError('BAD_INPUT');
      expect(receipt).toHaveTokenFailure('BAD_INPUT', 'SET_ADMIN_FEE_BOUNDS_CHECK');
      expect(await call(cToken, 'adminFeeMantissa')).toEqualNumber(0);
    });

    it("returns success from setAdminFeeFresh", async () => {
      expect(await call(cToken, 'adminFeeMantissa')).toEqualNumber(0);
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(cToken, '_setAdminFee', [factor])).toSucceed();
      expect(await call(cToken, 'adminFeeMantissa')).toEqualNumber(factor);
    });
  });

  describe("_withdrawAdminFeesFresh", () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
      expect(await send(cToken, 'harnessSetTotalAdminFees', [adminFees])).toSucceed();
      expect(
        await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cash])
      ).toSucceed();
    });

    it("fails if market not fresh", async () => {
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(cToken, 'harnessWithdrawAdminFeesFresh', [reduction])).toHaveTokenFailure('MARKET_NOT_FRESH', 'WITHDRAW_ADMIN_FEES_FRESH_CHECK');
      expect(await call(cToken, 'totalAdminFees')).toEqualNumber(adminFees);
    });

    it("fails if amount exceeds admin fees", async () => {
      expect(await send(cToken, 'harnessWithdrawAdminFeesFresh', [adminFees.add(1)])).toHaveTokenFailure('BAD_INPUT', 'WITHDRAW_ADMIN_FEES_VALIDATION');
      expect(await call(cToken, 'totalAdminFees')).toEqualNumber(adminFees);
    });

    it("fails if amount exceeds available cash", async () => {
      const cashLessThanAdminFees = adminFees.sub(2);
      await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cashLessThanAdminFees]);
      expect(await send(cToken, 'harnessWithdrawAdminFeesFresh', [adminFees])).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'WITHDRAW_ADMIN_FEES_CASH_NOT_AVAILABLE');
      expect(await call(cToken, 'totalAdminFees')).toEqualNumber(adminFees);
    });

    it("increases admin balance and reduces admin fees on success", async () => {
      const balance = etherUnsigned(await call(cToken.underlying, 'balanceOf', [root]));
      expect(await send(cToken, 'harnessWithdrawAdminFeesFresh', [adminFees])).toSucceed();
      expect(await call(cToken.underlying, 'balanceOf', [root])).toEqualNumber(balance.add(adminFees));
      expect(await call(cToken, 'totalAdminFees')).toEqualNumber(0);
    });
  });

  describe("_withdrawAdminFees", () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
      expect(await send(cToken, 'harnessSetTotalAdminFees', [adminFees])).toSucceed();
      expect(
        await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cash])
      ).toSucceed();
    });

    it("emits a reserve-reduction failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await fastForward(cToken, 1);
      await expect(send(cToken, '_withdrawAdminFees', [reduction])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from _withdrawAdminFeesFresh without emitting any extra logs", async () => {
      const {reply, receipt} = await both(cToken, 'harnessWithdrawAdminFeesFresh', [adminFees.add(1)]);
      expect(reply).toHaveTokenError('BAD_INPUT');
      expect(receipt).toHaveTokenFailure('BAD_INPUT', 'WITHDRAW_ADMIN_FEES_VALIDATION');
    });

    it("returns success code from _withdrawAdminFeesFresh and reduces the correct amount", async () => {
      expect(await call(cToken, 'totalAdminFees')).toEqualNumber(adminFees);
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(cToken, '_withdrawAdminFees', [reduction])).toSucceed();
    });
  });
});
