const {
  etherGasCost,
  etherUnsigned,
  etherMantissa,
  call,
  send
} = require('../Utils/MochaTruffle');

const {
  makeCToken,
  balanceOf,
  borrowSnapshot,
  totalBorrows,
  fastForward,
  setBalance,
  preApprove,
  pretendBorrow,
  setEtherBalance,
  getBalances,
  adjustBalances
} = require('../Utils/Compound');

const BigNumber = require('bignumber.js');

const borrowAmount = etherUnsigned(10e3);
const repayAmount = etherUnsigned(10e2);

async function preBorrow(cToken, borrower, borrowAmount) {
  await send(cToken.comptroller, 'setBorrowAllowed', [true]);
  await send(cToken.comptroller, 'setBorrowVerify', [true]);
  await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(cToken, 'harnessSetFailTransferToAddress', [borrower, false]);
  await send(cToken, 'harnessSetAccountBorrows', [borrower, 0, 0]);
  await send(cToken, 'harnessSetTotalBorrows', [0]);
  await setEtherBalance(cToken, borrowAmount);
}

async function borrowFresh(cToken, borrower, borrowAmount) {
  return send(cToken, 'harnessBorrowFresh', [borrower, borrowAmount], {from: borrower});
}

async function borrow(cToken, borrower, borrowAmount, opts = {}) {
  return send(cToken, 'borrow', [borrowAmount], {from: borrower});
}

async function preRepay(cToken, benefactor, borrower, repayAmount) {
  // setup either benefactor OR borrower for success in repaying
  await send(cToken.comptroller, 'setRepayBorrowAllowed', [true]);
  await send(cToken.comptroller, 'setRepayBorrowVerify', [true]);
  await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
  await pretendBorrow(cToken, borrower, 1, 1, repayAmount);
}

async function repayBorrowFresh(cToken, payer, borrower, repayAmount) {
  return send(cToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: payer, value: repayAmount});
}

async function repayBorrow(cToken, borrower, repayAmount) {
  return send(cToken, 'repayBorrow', [], {from: borrower, value: repayAmount});
}

async function repayBorrowBehalf(cToken, payer, borrower, repayAmount) {
  return send(cToken, 'repayBorrowBehalf', [borrower], {from: payer, value: repayAmount});
}

contract('CEther', function ([root, borrower, benefactor, ...accounts]) {
  let cToken;
  before(async () => {
    cToken = await makeCToken({kind: 'cether', comptrollerOpts: {kind: 'bool'}});
  });

  describe('borrowFresh', async () => {
    beforeEach(async () => await preBorrow(cToken, borrower, borrowAmount));

    it("fails if comptroller tells it to", async () => {
      await send(cToken.comptroller, 'setBorrowAllowed', [false]);
      assert.hasTrollReject(
        await borrowFresh(cToken, borrower, borrowAmount),
        'BORROW_COMPTROLLER_REJECTION'
      );
    });

    it("proceeds if comptroller tells it to", async () => {
      await assert.success(await borrowFresh(cToken, borrower, borrowAmount));
    });

    it("fails if market not fresh", async () => {
      await fastForward(cToken);
      assert.hasTokenFailure(
        await borrowFresh(cToken, borrower, borrowAmount),
        'MARKET_NOT_FRESH',
        'BORROW_FRESHNESS_CHECK'
      );
    });

    it("continues if fresh", async () => {
      await assert.succeeds(cToken, 'accrueInterest');
      await assert.success(await borrowFresh(cToken, borrower, borrowAmount));
    });

    it("fails if protocol has less than borrowAmount of underlying", async () => {
      assert.hasTokenFailure(
        await borrowFresh(cToken, borrower, borrowAmount.add(1)),
        'TOKEN_INSUFFICIENT_CASH',
        'BORROW_CASH_NOT_AVAILABLE'
      );
    });

    it("fails if borrowBalanceStored fails (due to non-zero stored principal with zero account index)", async () => {
      await pretendBorrow(cToken, borrower, 0, 3e18, 5e18);
      assert.hasTokenFailure(
        await borrowFresh(cToken, borrower, borrowAmount),
        'MATH_ERROR',
        'BORROW_ACCUMULATED_BALANCE_CALCULATION_FAILED'
      );
    });

    it("fails if calculating account new total borrow balance overflows", async () => {
      await pretendBorrow(cToken, borrower, 1e-18, 1e-18, -1);
      assert.hasTokenFailure(
        await borrowFresh(cToken, borrower, borrowAmount),
        'MATH_ERROR',
        'BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED'
      );
    });

    it("fails if calculation of new total borrow balance overflows", async () => {
      await send(cToken, 'harnessSetTotalBorrows', [-1]);
      assert.hasTokenFailure(
        await borrowFresh(cToken, borrower, borrowAmount),
        'MATH_ERROR',
        'BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED',
      );
    });

    it("reverts if transfer out fails", async () => {
      await send(cToken, 'harnessSetFailTransferToAddress', [borrower, true]);
      await assert.revert(borrowFresh(cToken, borrower, borrowAmount), "revert TOKEN_TRANSFER_OUT_FAILED");
    });

    it("reverts if borrowVerify fails", async() => {
      await send(cToken.comptroller, 'setBorrowVerify', [false]);
      await assert.revert(borrowFresh(cToken, borrower, borrowAmount), "revert borrowVerify rejected borrow");
    });

    it("transfers the underlying cash, tokens, and emits Borrow event", async () => {
      const beforeBalances = await getBalances([cToken], [borrower]);
      const beforeProtocolBorrows = await totalBorrows(cToken);
      const result = await borrowFresh(cToken, borrower, borrowAmount);
      const afterBalances = await getBalances([cToken], [borrower]);
      assert.success(result);
      assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
        [cToken, 'eth', -borrowAmount],
        [cToken, 'borrows', borrowAmount],
        [cToken, borrower, 'eth', borrowAmount.sub(await etherGasCost(result))],
        [cToken, borrower, 'borrows', borrowAmount]
      ]));
      assert.hasLog(result, 'Borrow', {
        borrower: borrower,
        borrowAmount: borrowAmount.toString(),
        accountBorrows: borrowAmount.toString(),
        totalBorrows: beforeProtocolBorrows.add(borrowAmount).toString()
      });
    });

    it("stores new borrow principal and interest index", async () => {
      const beforeProtocolBorrows = await totalBorrows(cToken);
      await pretendBorrow(cToken, borrower, 0, 3, 0);
      await borrowFresh(cToken, borrower, borrowAmount);
      const borrowSnap = await borrowSnapshot(cToken, borrower);
      assert.numEqual(borrowSnap.principal, borrowAmount);
      assert.numEqual(borrowSnap.interestIndex, etherMantissa(3));
      assert.numEqual(await totalBorrows(cToken), beforeProtocolBorrows.add(borrowAmount));
    });
  });

  describe('borrow', async () => {
    beforeEach(async () => await preBorrow(cToken, borrower, borrowAmount));

    it("emits a borrow failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(borrow(cToken, borrower, borrowAmount), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from borrowFresh without emitting any extra logs", async () => {
      assert.hasTokenFailure(
        await borrow(cToken, borrower, borrowAmount.add(1)),
        'TOKEN_INSUFFICIENT_CASH',
        'BORROW_CASH_NOT_AVAILABLE'
      );
    });

    it("returns success from borrowFresh and transfers the correct amount", async () => {
      const beforeBalances = await getBalances([cToken], [borrower]);
      await fastForward(cToken);
      const result = await borrow(cToken, borrower, borrowAmount);
      const afterBalances = await getBalances([cToken], [borrower]);
      assert.success(result);
      assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
        [cToken, 'eth', -borrowAmount],
        [cToken, 'borrows', borrowAmount],
        [cToken, borrower, 'eth', borrowAmount.sub(await etherGasCost(result))],
        [cToken, borrower, 'borrows', borrowAmount]
      ]));
    });
  });

  describe('repayBorrowFresh', async () => {
    [benefactor, borrower].forEach(async (payer) => {
      const label = benefactor == payer ? "benefactor paying" : "borrower paying";
      describe(label, () => {
        beforeEach(async () => {
          await preRepay(cToken, payer, borrower, repayAmount);
        });

        it("fails if repay is not allowed", async () => {
          await send(cToken.comptroller, 'setRepayBorrowAllowed', [false]);
          assert.hasTrollReject(
            await repayBorrowFresh(cToken, payer, borrower, repayAmount),
            'REPAY_BORROW_COMPTROLLER_REJECTION',
            'MATH_ERROR'
          );
        });

        it("fails if block number ≠ current block number", async () => {
          await fastForward(cToken);
          assert.hasTokenFailure(
            await repayBorrowFresh(cToken, payer, borrower, repayAmount),
            'MARKET_NOT_FRESH',
            'REPAY_BORROW_FRESHNESS_CHECK'
          );
        });

        it("returns an error if calculating account new account borrow balance fails", async () => {
          await pretendBorrow(cToken, borrower, 1, 1, 1);
          await assert.revert(
            repayBorrowFresh(cToken, payer, borrower, repayAmount),
            'revert REPAY_BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED'
          );
        });

        it("returns an error if calculation of new total borrow balance fails", async () => {
          await send(cToken, 'harnessSetTotalBorrows', [1]);
          await assert.revert(
            repayBorrowFresh(cToken, payer, borrower, repayAmount),
            'revert REPAY_BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED'
          );
        });

        it("reverts if checkTransferIn fails", async () => {
          await assert.revert(send(cToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: root, value: repayAmount}), "revert sender mismatch");
          await assert.revert(send(cToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: payer, value: 1}), "revert value mismatch");
        });

        it("reverts if repayBorrowVerify fails", async() => {
          await send(cToken.comptroller, 'setRepayBorrowVerify', [false]);
          await assert.revert(repayBorrowFresh(cToken, payer, borrower, repayAmount), "revert repayBorrowVerify rejected repayBorrow");
        });

        it("transfers the underlying cash, and emits RepayBorrow event", async () => {
          const beforeBalances = await getBalances([cToken], [borrower]);
          const result = await repayBorrowFresh(cToken, payer, borrower, repayAmount);
          const afterBalances = await getBalances([cToken], [borrower]);
          assert.success(result);
          if (borrower == payer) {
            assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
              [cToken, 'eth', repayAmount],
              [cToken, 'borrows', -repayAmount],
              [cToken, borrower, 'borrows', -repayAmount],
              [cToken, borrower, 'eth', -repayAmount.add(await etherGasCost(result))]
            ]));
          } else {
            assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
              [cToken, 'eth', repayAmount],
              [cToken, 'borrows', -repayAmount],
              [cToken, borrower, 'borrows', -repayAmount],
            ]));
          }
          assert.hasLog(result, 'RepayBorrow', {
            payer: payer,
            borrower: borrower,
            repayAmount: repayAmount.toString(),
            accountBorrows: "0",
            totalBorrows: "0"
          });
        });

        it("stores new borrow principal and interest index", async () => {
          const beforeProtocolBorrows = await totalBorrows(cToken);
          const beforeAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
          assert.success(await repayBorrowFresh(cToken, payer, borrower, repayAmount));
          const afterAccountBorrows = await borrowSnapshot(cToken, borrower);
          assert.numEqual(afterAccountBorrows.principal, beforeAccountBorrowSnap.principal.sub(repayAmount));
          assert.numEqual(afterAccountBorrows.interestIndex, etherMantissa(1));
          assert.numEqual(await totalBorrows(cToken), beforeProtocolBorrows.sub(repayAmount));
        });
      });
    });
  });

  describe('repayBorrow', async () => {
    beforeEach(async () => {
      await preRepay(cToken, borrower, borrower, repayAmount);
    });

    it("reverts if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(repayBorrow(cToken, borrower, repayAmount), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("reverts when repay borrow fresh fails", async () => {
      await send(cToken.comptroller, 'setRepayBorrowAllowed', [false]);
      await assert.revertWithError(repayBorrow(cToken, borrower, repayAmount), 'COMPTROLLER_REJECTION', "revert repayBorrow failed");
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(cToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
      assert.success(await repayBorrow(cToken, borrower, repayAmount));
      const afterAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
      assert.numEqual(afterAccountBorrowSnap.principal, beforeAccountBorrowSnap.principal.sub(repayAmount));
    });

    it("reverts if overpaying", async () => {
      const beforeAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
      let tooMuch = new BigNumber(beforeAccountBorrowSnap.principal).plus(1);
      await assert.revert(repayBorrow(cToken, borrower, tooMuch), "revert REPAY_BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED");
      // await assert.revertWithError(repayBorrow(cToken, borrower, tooMuch), 'MATH_ERROR', "revert repayBorrow failed");
    });
  });

  describe('repayBorrowBehalf', async () => {
    const payer = benefactor;

    beforeEach(async () => {
      await preRepay(cToken, payer, borrower, repayAmount);
    });

    it("reverts if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(repayBorrowBehalf(cToken, payer, borrower, repayAmount), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("reverts from within repay borrow fresh", async () => {
      await send(cToken.comptroller, 'setRepayBorrowAllowed', [false]);
      await assert.revertWithError(repayBorrowBehalf(cToken, payer, borrower, repayAmount), 'COMPTROLLER_REJECTION', "revert repayBorrowBehalf failed");
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(cToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
      assert.success(await repayBorrowBehalf(cToken, payer, borrower, repayAmount));
      const afterAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
      assert.numEqual(afterAccountBorrowSnap.principal, beforeAccountBorrowSnap.principal.sub(repayAmount));
    });
  });
});
