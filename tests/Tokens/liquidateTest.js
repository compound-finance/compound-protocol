const {
  etherGasCost,
  etherUnsigned,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeVToken,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  pretendBorrow,
  preApprove
} = require('../Utils/Vortex');

const repayAmount = etherUnsigned(10e2);
const seizeAmount = repayAmount;
const seizeTokens = seizeAmount.multipliedBy(4); // forced

async function preLiquidate(vToken, liquidator, borrower, repayAmount, vTokenCollateral) {
  // setup for success in liquidating
  await send(vToken.controller, 'setLiquidateBorrowAllowed', [true]);
  await send(vToken.controller, 'setLiquidateBorrowVerify', [true]);
  await send(vToken.controller, 'setRepayBorrowAllowed', [true]);
  await send(vToken.controller, 'setRepayBorrowVerify', [true]);
  await send(vToken.controller, 'setSeizeAllowed', [true]);
  await send(vToken.controller, 'setSeizeVerify', [true]);
  await send(vToken.controller, 'setFailCalculateSeizeTokens', [false]);
  await send(vToken.underlying, 'harnessSetFailTransferFromAddress', [liquidator, false]);
  await send(vToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(vTokenCollateral.interestRateModel, 'setFailBorrowRate', [false]);
  await send(vTokenCollateral.controller, 'setCalculatedSeizeTokens', [seizeTokens]);
  await setBalance(vTokenCollateral, liquidator, 0);
  await setBalance(vTokenCollateral, borrower, seizeTokens);
  await pretendBorrow(vTokenCollateral, borrower, 0, 1, 0);
  await pretendBorrow(vToken, borrower, 1, 1, repayAmount);
  await preApprove(vToken, liquidator, repayAmount);
}

async function liquidateFresh(vToken, liquidator, borrower, repayAmount, vTokenCollateral) {
  return send(vToken, 'harnessLiquidateBorrowFresh', [liquidator, borrower, repayAmount, vTokenCollateral._address]);
}

async function liquidate(vToken, liquidator, borrower, repayAmount, vTokenCollateral) {
  // make sure to have a block delta so we accrue interest
  await fastForward(vToken, 1);
  await fastForward(vTokenCollateral, 1);
  return send(vToken, 'liquidateBorrow', [borrower, repayAmount, vTokenCollateral._address], {from: liquidator});
}

async function seize(vToken, liquidator, borrower, seizeAmount) {
  return send(vToken, 'seize', [liquidator, borrower, seizeAmount]);
}

describe('VToken', function () {
  let root, liquidator, borrower, accounts;
  let vToken, vTokenCollateral;

  beforeEach(async () => {
    [root, liquidator, borrower, ...accounts] = saddle.accounts;
    vToken = await makeVToken({controllerOpts: {kind: 'bool'}});
    vTokenCollateral = await makeVToken({controller: vToken.controller});
  });

  beforeEach(async () => {
    await preLiquidate(vToken, liquidator, borrower, repayAmount, vTokenCollateral);
  });

  describe('liquidateBorrowFresh', () => {
    it("fails if controller tells it to", async () => {
      await send(vToken.controller, 'setLiquidateBorrowAllowed', [false]);
      expect(
        await liquidateFresh(vToken, liquidator, borrower, repayAmount, vTokenCollateral)
      ).toHaveTrollReject('LIQUIDATE_CONTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("proceeds if controller tells it to", async () => {
      expect(
        await liquidateFresh(vToken, liquidator, borrower, repayAmount, vTokenCollateral)
      ).toSucceed();
    });

    it("fails if market not fresh", async () => {
      await fastForward(vToken);
      expect(
        await liquidateFresh(vToken, liquidator, borrower, repayAmount, vTokenCollateral)
      ).toHaveTokenFailure('MARKET_NOT_FRESH', 'LIQUIDATE_FRESHNESS_CHECK');
    });

    it("fails if collateral market not fresh", async () => {
      await fastForward(vToken);
      await fastForward(vTokenCollateral);
      await send(vToken, 'accrueInterest');
      expect(
        await liquidateFresh(vToken, liquidator, borrower, repayAmount, vTokenCollateral)
      ).toHaveTokenFailure('MARKET_NOT_FRESH', 'LIQUIDATE_COLLATERAL_FRESHNESS_CHECK');
    });

    it("fails if borrower is equal to liquidator", async () => {
      expect(
        await liquidateFresh(vToken, borrower, borrower, repayAmount, vTokenCollateral)
      ).toHaveTokenFailure('INVALID_ACCOUNT_PAIR', 'LIQUIDATE_LIQUIDATOR_IS_BORROWER');
    });

    it("fails if repayAmount = 0", async () => {
      expect(await liquidateFresh(vToken, liquidator, borrower, 0, vTokenCollateral)).toHaveTokenFailure('INVALID_CLOSE_AMOUNT_REQUESTED', 'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO');
    });

    it("fails if calculating seize tokens fails and does not adjust balances", async () => {
      const beforeBalances = await getBalances([vToken, vTokenCollateral], [liquidator, borrower]);
      await send(vToken.controller, 'setFailCalculateSeizeTokens', [true]);
      await expect(
        liquidateFresh(vToken, liquidator, borrower, repayAmount, vTokenCollateral)
      ).rejects.toRevert('revert LIQUIDATE_CONTROLLER_CALCULATE_AMOUNT_SEIZE_FAILED');
      const afterBalances = await getBalances([vToken, vTokenCollateral], [liquidator, borrower]);
      expect(afterBalances).toEqual(beforeBalances);
    });

    it("fails if repay fails", async () => {
      await send(vToken.controller, 'setRepayBorrowAllowed', [false]);
      expect(
        await liquidateFresh(vToken, liquidator, borrower, repayAmount, vTokenCollateral)
      ).toHaveTrollReject('LIQUIDATE_REPAY_BORROW_FRESH_FAILED');
    });

    it("reverts if seize fails", async () => {
      await send(vToken.controller, 'setSeizeAllowed', [false]);
      await expect(
        liquidateFresh(vToken, liquidator, borrower, repayAmount, vTokenCollateral)
      ).rejects.toRevert("revert token seizure failed");
    });

    xit("reverts if liquidateBorrowVerify fails", async() => {
      await send(vToken.controller, 'setLiquidateBorrowVerify', [false]);
      await expect(
        liquidateFresh(vToken, liquidator, borrower, repayAmount, vTokenCollateral)
      ).rejects.toRevert("revert liquidateBorrowVerify rejected liquidateBorrow");
    });

    it("transfers the cash, borrows, tokens, and emits Transfer, LiquidateBorrow events", async () => {
      const beforeBalances = await getBalances([vToken, vTokenCollateral], [liquidator, borrower]);
      const result = await liquidateFresh(vToken, liquidator, borrower, repayAmount, vTokenCollateral);
      const afterBalances = await getBalances([vToken, vTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog('LiquidateBorrow', {
        liquidator: liquidator,
        borrower: borrower,
        repayAmount: repayAmount.toString(),
        vTokenCollateral: vTokenCollateral._address,
        seizeTokens: seizeTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 0], {
        from: liquidator,
        to: vToken._address,
        amount: repayAmount.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: borrower,
        to: liquidator,
        amount: seizeTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [vToken, 'cash', repayAmount],
        [vToken, 'borrows', -repayAmount],
        [vToken, liquidator, 'cash', -repayAmount],
        [vTokenCollateral, liquidator, 'tokens', seizeTokens],
        [vToken, borrower, 'borrows', -repayAmount],
        [vTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });

  describe('liquidateBorrow', () => {
    it("emits a liquidation failure if borrowed asset interest accrual fails", async () => {
      await send(vToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(vToken, liquidator, borrower, repayAmount, vTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("emits a liquidation failure if collateral asset interest accrual fails", async () => {
      await send(vTokenCollateral.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(vToken, liquidator, borrower, repayAmount, vTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from liquidateBorrowFresh without emitting any extra logs", async () => {
      expect(await liquidate(vToken, liquidator, borrower, 0, vTokenCollateral)).toHaveTokenFailure('INVALID_CLOSE_AMOUNT_REQUESTED', 'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO');
    });

    it("returns success from liquidateBorrowFresh and transfers the correct amounts", async () => {
      const beforeBalances = await getBalances([vToken, vTokenCollateral], [liquidator, borrower]);
      const result = await liquidate(vToken, liquidator, borrower, repayAmount, vTokenCollateral);
      const gasCost = await etherGasCost(result);
      const afterBalances = await getBalances([vToken, vTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [vToken, 'cash', repayAmount],
        [vToken, 'borrows', -repayAmount],
        [vToken, liquidator, 'eth', -gasCost],
        [vToken, liquidator, 'cash', -repayAmount],
        [vTokenCollateral, liquidator, 'eth', -gasCost],
        [vTokenCollateral, liquidator, 'tokens', seizeTokens],
        [vToken, borrower, 'borrows', -repayAmount],
        [vTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });

  describe('seize', () => {
    // XXX verify callers are properly checked

    it("fails if seize is not allowed", async () => {
      await send(vToken.controller, 'setSeizeAllowed', [false]);
      expect(await seize(vTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTrollReject('LIQUIDATE_SEIZE_CONTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("fails if vTokenBalances[borrower] < amount", async () => {
      await setBalance(vTokenCollateral, borrower, 1);
      expect(await seize(vTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTokenMathFailure('LIQUIDATE_SEIZE_BALANCE_DECREMENT_FAILED', 'INTEGER_UNDERFLOW');
    });

    it("fails if vTokenBalances[liquidator] overflows", async () => {
      await setBalance(vTokenCollateral, liquidator, UInt256Max());
      expect(await seize(vTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTokenMathFailure('LIQUIDATE_SEIZE_BALANCE_INCREMENT_FAILED', 'INTEGER_OVERFLOW');
    });

    it("succeeds, updates balances, and emits Transfer event", async () => {
      const beforeBalances = await getBalances([vTokenCollateral], [liquidator, borrower]);
      const result = await seize(vTokenCollateral, liquidator, borrower, seizeTokens);
      const afterBalances = await getBalances([vTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog('Transfer', {
        from: borrower,
        to: liquidator,
        amount: seizeTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [vTokenCollateral, liquidator, 'tokens', seizeTokens],
        [vTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });
});
