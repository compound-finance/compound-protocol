const {
  etherGasCost,
  etherUnsigned,
  call,
  send
} = require('../Utils/MochaTruffle');

const {
  makeCToken,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  pretendBorrow,
  preApprove
} = require('../Utils/Compound');

const repayAmount = etherUnsigned(10e2);
const seizeAmount = repayAmount;
const seizeTokens = seizeAmount.mul(4); // forced

async function preLiquidate(cToken, liquidator, borrower, repayAmount, cTokenCollateral) {
  // setup for success in liquidating
  await send(cToken.comptroller, 'setLiquidateBorrowAllowed', [true]);
  await send(cToken.comptroller, 'setLiquidateBorrowVerify', [true]);
  await send(cToken.comptroller, 'setRepayBorrowAllowed', [true]);
  await send(cToken.comptroller, 'setRepayBorrowVerify', [true]);
  await send(cToken.comptroller, 'setSeizeAllowed', [true]);
  await send(cToken.comptroller, 'setSeizeVerify', [true]);
  await send(cToken.comptroller, 'setFailCalculateSeizeTokens', [false]);
  await send(cToken.underlying, 'harnessSetFailTransferFromAddress', [liquidator, false]);
  await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(cTokenCollateral.interestRateModel, 'setFailBorrowRate', [false]);
  await send(cTokenCollateral.comptroller, 'setCalculatedSeizeTokens', [seizeTokens]);
  await setBalance(cTokenCollateral, liquidator, 0);
  await setBalance(cTokenCollateral, borrower, seizeTokens);
  await pretendBorrow(cTokenCollateral, borrower, 0, 1, 0);
  await pretendBorrow(cToken, borrower, 1, 1, repayAmount);
  await preApprove(cToken, liquidator, repayAmount);
}

async function liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral) {
  return send(cToken, 'harnessLiquidateBorrowFresh', [liquidator, borrower, repayAmount, cTokenCollateral._address]);
}

async function liquidate(cToken, liquidator, borrower, repayAmount, cTokenCollateral) {
  return send(cToken, 'liquidateBorrow', [borrower, repayAmount, cTokenCollateral._address], {from: liquidator});
}

async function seize(cToken, liquidator, borrower, seizeAmount) {
  return send(cToken, 'seize', [liquidator, borrower, seizeAmount]);
}

contract('CToken', function ([root, liquidator, borrower, ...accounts]) {
  let cToken, cTokenCollateral;
  before(async () => {
    cToken = await makeCToken({comptrollerOpts: {kind: 'bool'}});
    cTokenCollateral = await makeCToken({comptroller: cToken.comptroller});
  });

  beforeEach(async () => {
    await preLiquidate(cToken, liquidator, borrower, repayAmount, cTokenCollateral);
  });

  describe('liquidateBorrowFresh', async () => {
    it("fails if comptroller tells it to", async () => {
      await send(cToken.comptroller, 'setLiquidateBorrowAllowed', [false]);
      assert.hasTrollReject(
        await liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral),
        'LIQUIDATE_COMPTROLLER_REJECTION',
        'MATH_ERROR'
      );
    });

    it("proceeds if comptroller tells it to", async () => {
      assert.success(await liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral));
    });

    it("fails if market not fresh", async () => {
      await fastForward(cToken);
      assert.hasTokenFailure(
        await liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral),
        'MARKET_NOT_FRESH',
        'LIQUIDATE_FRESHNESS_CHECK'
      );
    });

    it("fails if collateral market not fresh", async () => {
      await fastForward(cToken);
      await fastForward(cTokenCollateral);
      await send(cToken, 'accrueInterest');
      assert.hasTokenFailure(
        await liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral),
        'MARKET_NOT_FRESH',
        'LIQUIDATE_COLLATERAL_FRESHNESS_CHECK'
      );
    });

    it("fails if borrower is equal to liquidator", async () => {
      assert.hasTokenFailure(
        await liquidateFresh(cToken, borrower, borrower, repayAmount, cTokenCollateral),
        'INVALID_ACCOUNT_PAIR',
        'LIQUIDATE_LIQUIDATOR_IS_BORROWER'
      );
    });

    it("fails if repayAmount = 0", async () => {
      assert.hasTokenFailure(
        await liquidateFresh(cToken, liquidator, borrower, 0, cTokenCollateral),
        'INVALID_CLOSE_AMOUNT_REQUESTED',
        'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO'
      );
    });

    it("fails if calculating seize tokens fails and does not adjust balances", async () => {
      const beforeBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      await send(cToken.comptroller, 'setFailCalculateSeizeTokens', [true]);
      await assert.revert(
        liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral),
        'revert LIQUIDATE_COMPTROLLER_CALCULATE_AMOUNT_SEIZE_FAILED',
      );
      const afterBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      assert.deepEqual(afterBalances, beforeBalances);
    });

    it("fails if repay fails", async () => {
      await send(cToken.comptroller, 'setRepayBorrowAllowed', [false]);
      assert.hasTrollReject(
        await liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral),
        'LIQUIDATE_REPAY_BORROW_FRESH_FAILED'
      );
    });

    it("reverts if seize fails", async () => {
      await send(cToken.comptroller, 'setSeizeAllowed', [false]);
      await assert.revert(liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral), "revert token seizure failed");
    });

    it("reverts if liquidateBorrowVerify fails", async() => {
      await send(cToken.comptroller, 'setLiquidateBorrowVerify', [false]);
      await assert.revert(liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral), "revert liquidateBorrowVerify rejected liquidateBorrow");
    });

    it("transfers the cash, borrows, tokens, and emits Transfer, LiquidateBorrow events", async () => {
      const beforeBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      const result = await liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral);
      const afterBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      assert.success(result);
      assert.hasLog(result, 'LiquidateBorrow', {
        liquidator: liquidator,
        borrower: borrower,
        repayAmount: repayAmount.toString(),
        cTokenCollateral: cTokenCollateral._address,
        seizeTokens: seizeTokens.toString()
      });
      assert.hasLog(result, ['Transfer', 0], {
        from: liquidator,
        to: cToken._address,
        amount: repayAmount.toString()
      });
      assert.hasLog(result, ['Transfer', 1], {
        from: borrower,
        to: liquidator,
        amount: seizeTokens.toString()
      });
      assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
        [cToken, 'cash', repayAmount],
        [cToken, 'borrows', -repayAmount],
        [cToken, liquidator, 'cash', -repayAmount],
        [cTokenCollateral, liquidator, 'tokens', seizeTokens],
        [cToken, borrower, 'borrows', -repayAmount],
        [cTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });

  describe('liquidateBorrow', async () => {
    it("emits a liquidation failure if borrowed asset interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(liquidate(cToken, liquidator, borrower, repayAmount, cTokenCollateral), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("emits a liquidation failure if collateral asset interest accrual fails", async () => {
      await send(cTokenCollateral.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(liquidate(cToken, liquidator, borrower, repayAmount, cTokenCollateral), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from liquidateBorrowFresh without emitting any extra logs", async () => {
      assert.hasTokenFailure(
        await liquidate(cToken, liquidator, borrower, 0, cTokenCollateral),
        'INVALID_CLOSE_AMOUNT_REQUESTED',
        'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO'
      );
    });

    it("returns success from liquidateBorrowFresh and transfers the correct amounts", async () => {
      const beforeBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      const result = await liquidate(cToken, liquidator, borrower, repayAmount, cTokenCollateral);
      const gasCost = await etherGasCost(result);
      const afterBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      assert.success(result);
      assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
        [cToken, 'cash', repayAmount],
        [cToken, 'borrows', -repayAmount],
        [cToken, liquidator, 'eth', -gasCost],
        [cToken, liquidator, 'cash', -repayAmount],
        [cTokenCollateral, liquidator, 'eth', -gasCost],
        [cTokenCollateral, liquidator, 'tokens', seizeTokens],
        [cToken, borrower, 'borrows', -repayAmount],
        [cTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });

  describe('seize', async () => {
    // XXX verify callers are properly checked

    it("fails if seize is not allowed", async () => {
      await send(cToken.comptroller, 'setSeizeAllowed', [false]);
      assert.hasTrollReject(
        await seize(cTokenCollateral, liquidator, borrower, seizeTokens),
        'LIQUIDATE_SEIZE_COMPTROLLER_REJECTION',
        'MATH_ERROR'
      );
    });

    it("fails if cTokenBalances[borrower] < amount", async () => {
      await setBalance(cTokenCollateral, borrower, 1);
      assert.hasTokenMathFail(
        await seize(cTokenCollateral, liquidator, borrower, seizeTokens),
        'LIQUIDATE_SEIZE_BALANCE_DECREMENT_FAILED',
        'INTEGER_UNDERFLOW'
      );
    });

    it("fails if cTokenBalances[liquidator] overflows", async () => {
      await setBalance(cTokenCollateral, liquidator, -1);
      assert.hasTokenMathFail(
        await seize(cTokenCollateral, liquidator, borrower, seizeTokens),
        'LIQUIDATE_SEIZE_BALANCE_INCREMENT_FAILED',
        'INTEGER_OVERFLOW'
      );
    });

    it("succeeds, updates balances, and emits Transfer event", async () => {
      const beforeBalances = await getBalances([cTokenCollateral], [liquidator, borrower]);
      const result = await seize(cTokenCollateral, liquidator, borrower, seizeTokens);
      const afterBalances = await getBalances([cTokenCollateral], [liquidator, borrower]);
      assert.success(result);
      assert.hasLog(result, 'Transfer', {
        from: borrower,
        to: liquidator,
        amount: seizeTokens.toString()
      });
      assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
        [cTokenCollateral, liquidator, 'tokens', seizeTokens],
        [cTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });
});