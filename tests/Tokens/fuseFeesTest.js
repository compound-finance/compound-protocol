const {
  etherUnsigned,
  etherMantissa,
  both
} = require('../Utils/Ethereum');

const {fastForward, makeCToken} = require('../Utils/Compound');

const factor = etherMantissa(.02);

const fuseFees = etherUnsigned(3e12);
const cash = etherUnsigned(fuseFees.mul(2));
const reduction = etherUnsigned(2e12);

describe('CToken', function () {
  let root, accounts;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe('_setFuseFeeFresh', () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
    });

    it("rejects change if market not fresh", async () => {
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(cToken, 'harnessSetFuseFeeFresh', [factor])).toHaveTokenFailure('MARKET_NOT_FRESH', 'SET_FUSE_FEE_FRESH_CHECK');
      expect(await call(cToken, 'fuseFeeMantissa')).toEqualNumber(0);
    });

    it("rejects newFuseFee that descales to 1", async () => {
      expect(await send(cToken, 'harnessSetFuseFeeFresh', [etherMantissa(1.01)])).toHaveTokenFailure('BAD_INPUT', 'SET_FUSE_FEE_BOUNDS_CHECK');
      expect(await call(cToken, 'fuseFeeMantissa')).toEqualNumber(0);
    });

    it("accepts newFuseFee in valid range and emits log", async () => {
      const result = await send(cToken, 'harnessSetFuseFeeFresh', [factor])
      expect(result).toSucceed();
      expect(await call(cToken, 'fuseFeeMantissa')).toEqualNumber(factor);
      expect(result).toHaveLog("NewFuseFee", {
        oldFuseFeeMantissa: '0',
        newFuseFeeMantissa: factor.toString(),
      });
    });

    it("accepts a change back to zero", async () => {
      const result1 = await send(cToken, 'harnessSetFuseFeeFresh', [factor]);
      const result2 = await send(cToken, 'harnessSetFuseFeeFresh', [0]);
      expect(result1).toSucceed();
      expect(result2).toSucceed();
      expect(result2).toHaveLog("NewFuseFee", {
        oldFuseFeeMantissa: factor.toString(),
        newFuseFeeMantissa: '0',
      });
      expect(await call(cToken, 'fuseFeeMantissa')).toEqualNumber(0);
    });
  });

  describe('_setFuseFee', () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
    });

    beforeEach(async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
      await send(cToken, 'setPendingFuseFee', [0])
      await send(cToken, '_setFuseFee', []);
    });

    it("emits a Fuse fee failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await fastForward(cToken, 1);
      await send(cToken, 'setPendingFuseFee', [factor])
      await expect(send(cToken, '_setFuseFee', [])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      expect(await call(cToken, 'fuseFeeMantissa')).toEqualNumber(0);
    });

    it("returns error from setFuseFeeFresh without emitting any extra logs", async () => {
      await send(cToken, 'setPendingFuseFee', [etherMantissa(2)])
      const {reply, receipt} = await both(cToken, '_setFuseFee', []);
      expect(reply).toHaveTokenError('BAD_INPUT');
      expect(receipt).toHaveTokenFailure('BAD_INPUT', 'SET_FUSE_FEE_BOUNDS_CHECK');
      expect(await call(cToken, 'fuseFeeMantissa')).toEqualNumber(0);
    });

    it("returns success from setFuseFeeFresh", async () => {
      expect(await call(cToken, 'fuseFeeMantissa')).toEqualNumber(0);
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      await send(cToken, 'setPendingFuseFee', [factor])
      expect(await send(cToken, '_setFuseFee', [])).toSucceed();
      expect(await call(cToken, 'fuseFeeMantissa')).toEqualNumber(factor);
    });
  });

  describe("_withdrawFuseFeesFresh", () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
      expect(await send(cToken, 'harnessSetTotalFuseFees', [fuseFees])).toSucceed();
      expect(
        await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cash])
      ).toSucceed();
    });

    it("fails if market not fresh", async () => {
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(cToken, 'harnessWithdrawFuseFeesFresh', [reduction])).toHaveTokenFailure('MARKET_NOT_FRESH', 'WITHDRAW_FUSE_FEES_FRESH_CHECK');
      expect(await call(cToken, 'totalFuseFees')).toEqualNumber(fuseFees);
    });

    it("fails if amount exceeds Fuse fees", async () => {
      expect(await send(cToken, 'harnessWithdrawFuseFeesFresh', [fuseFees.add(1)])).toHaveTokenFailure('BAD_INPUT', 'WITHDRAW_FUSE_FEES_VALIDATION');
      expect(await call(cToken, 'totalFuseFees')).toEqualNumber(fuseFees);
    });

    it("fails if amount exceeds available cash", async () => {
      const cashLessThanFuseFees = fuseFees.sub(2);
      await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cashLessThanFuseFees]);
      expect(await send(cToken, 'harnessWithdrawFuseFeesFresh', [fuseFees])).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'WITHDRAW_FUSE_FEES_CASH_NOT_AVAILABLE');
      expect(await call(cToken, 'totalFuseFees')).toEqualNumber(fuseFees);
    });

    it("increases Fuse admin balance and reduces Fuse fees on success", async () => {
      const balance = etherUnsigned(await call(cToken.underlying, 'balanceOf', ["0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"]));
      expect(await send(cToken, 'harnessWithdrawFuseFeesFresh', [fuseFees])).toSucceed();
      expect(await call(cToken.underlying, 'balanceOf', ["0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"])).toEqualNumber(balance.add(fuseFees));
      expect(await call(cToken, 'totalFuseFees')).toEqualNumber(0);
    });
  });

  describe("_withdrawFuseFees", () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
      expect(await send(cToken, 'harnessSetTotalFuseFees', [fuseFees])).toSucceed();
      expect(
        await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cash])
      ).toSucceed();
    });

    it("emits a reserve-reduction failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await fastForward(cToken, 1);
      await expect(send(cToken, '_withdrawFuseFees', [reduction])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from _withdrawFuseFeesFresh without emitting any extra logs", async () => {
      const {reply, receipt} = await both(cToken, 'harnessWithdrawFuseFeesFresh', [fuseFees.add(1)]);
      expect(reply).toHaveTokenError('BAD_INPUT');
      expect(receipt).toHaveTokenFailure('BAD_INPUT', 'WITHDRAW_FUSE_FEES_VALIDATION');
    });

    it("returns success code from _withdrawFuseFeesFresh and reduces the correct amount", async () => {
      expect(await call(cToken, 'totalFuseFees')).toEqualNumber(fuseFees);
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(cToken, '_withdrawFuseFees', [reduction])).toSucceed();
    });
  });
});
