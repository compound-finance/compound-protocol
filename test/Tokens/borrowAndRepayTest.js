const {
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
  pretendBorrow
} = require('../Utils/Compound');

const borrowAmount = etherUnsigned(10e3);
const repayAmount = etherUnsigned(10e2);

async function preBorrow(cToken, borrower, borrowAmount) {
  await send(cToken.comptroller, 'setBorrowAllowed', [true]);
  await send(cToken.comptroller, 'setBorrowVerify', [true]);
  await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(cToken.underlying, 'harnessSetBalance', [cToken._address, borrowAmount]);
  await send(cToken, 'harnessSetFailTransferToAddress', [borrower, false]);
  await send(cToken, 'harnessSetAccountBorrows', [borrower, 0, 0]);
  await send(cToken, 'harnessSetTotalBorrows', [0]);
}

async function borrowFresh(cToken, borrower, borrowAmount) {
  return send(cToken, 'harnessBorrowFresh', [borrower, borrowAmount]);
}

async function borrow(cToken, borrower, borrowAmount, opts = {}) {
  return send(cToken, 'borrow', [borrowAmount], {from: borrower});
}

async function preRepay(cToken, benefactor, borrower, repayAmount) {
  // setup either benefactor OR borrower for success in repaying
  await send(cToken.comptroller, 'setRepayBorrowAllowed', [true]);
  await send(cToken.comptroller, 'setRepayBorrowVerify', [true]);
  await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(cToken.underlying, 'harnessSetFailTransferFromAddress', [benefactor, false]);
  await send(cToken.underlying, 'harnessSetFailTransferFromAddress', [borrower, false]);
  await pretendBorrow(cToken, borrower, 1, 1, repayAmount);
  await preApprove(cToken, benefactor, repayAmount);
  await preApprove(cToken, borrower, repayAmount);
}

async function repayBorrowFresh(cToken, payer, borrower, repayAmount) {
  return send(cToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: payer});
}

async function repayBorrow(cToken, borrower, repayAmount) {
  return send(cToken, 'repayBorrow', [repayAmount], {from: borrower});
}

async function repayBorrowBehalf(cToken, payer, borrower, repayAmount) {
  return send(cToken, 'repayBorrowBehalf', [borrower, repayAmount], {from: payer});
}

contract('CToken', function ([root, borrower, benefactor, ...accounts]) {
  let cToken;
  before(async () => {
    cToken = await makeCToken({comptrollerOpts: {kind: 'bool'}});
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

    it("fails if error if protocol has less than borrowAmount of underlying", async () => {
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

    it("transfers the underlying cash, tokens, and emits Transfer, Borrow events", async () => {
      const beforeProtocolCash = await balanceOf(cToken.underlying, cToken._address);
      const beforeProtocolBorrows = await totalBorrows(cToken);
      const beforeAccountCash = await balanceOf(cToken.underlying, borrower);
      const result = await borrowFresh(cToken, borrower, borrowAmount);
      assert.success(result);
      assert.numEqual(await balanceOf(cToken.underlying, borrower), beforeAccountCash.add(borrowAmount));
      assert.numEqual(await balanceOf(cToken.underlying, cToken._address), beforeProtocolCash.sub(borrowAmount));
      assert.numEqual(await totalBorrows(cToken), beforeProtocolBorrows.add(borrowAmount));
      assert.hasLog(result, 'Transfer', {
        from: cToken._address,
        to: borrower,
        amount: borrowAmount.toString()
      });
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
      const beforeAccountCash = await balanceOf(cToken.underlying, borrower);
      await fastForward(cToken);
      assert.success(await borrow(cToken, borrower, borrowAmount));
      assert.numEqual(await balanceOf(cToken.underlying, borrower), beforeAccountCash.add(borrowAmount));
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

        it("fails if insufficient approval", async() => {
          await preApprove(cToken, payer, 1);
          assert.hasTokenFailure(
            await repayBorrowFresh(cToken, payer, borrower, repayAmount),
            'TOKEN_INSUFFICIENT_ALLOWANCE',
            'REPAY_BORROW_TRANSFER_IN_NOT_POSSIBLE'
          );
        });

        it("fails if insufficient balance", async() => {
          await setBalance(cToken.underlying, payer, 1);
          assert.hasTokenFailure(
            await repayBorrowFresh(cToken, payer, borrower, repayAmount),
            'TOKEN_INSUFFICIENT_BALANCE',
            'REPAY_BORROW_TRANSFER_IN_NOT_POSSIBLE'
          );
        });


        it("returns an error if calculating account new account borrow balance fails", async () => {
          await pretendBorrow(cToken, borrower, 1, 1, 1);
          await assert.revert(
            repayBorrowFresh(cToken, payer, borrower, repayAmount),
            "revert REPAY_BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED"
          );
        });

        it("returns an error if calculation of new total borrow balance fails", async () => {
          await send(cToken, 'harnessSetTotalBorrows', [1]);
          await assert.revert(
            repayBorrowFresh(cToken, payer, borrower, repayAmount),
            "revert REPAY_BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED"
          );
        });


        it("reverts if doTransferIn fails", async () => {
          await send(cToken.underlying, 'harnessSetFailTransferFromAddress', [payer, true]);
          await assert.revert(repayBorrowFresh(cToken, payer, borrower, repayAmount), "revert TOKEN_TRANSFER_IN_FAILED");
        });

        it("reverts if repayBorrowVerify fails", async() => {
          await send(cToken.comptroller, 'setRepayBorrowVerify', [false]);
          await assert.revert(repayBorrowFresh(cToken, payer, borrower, repayAmount), "revert repayBorrowVerify rejected repayBorrow");
        });

        it("transfers the underlying cash, and emits Transfer, RepayBorrow events", async () => {
          const beforeProtocolCash = await balanceOf(cToken.underlying, cToken._address);
          const result = await repayBorrowFresh(cToken, payer, borrower, repayAmount);
          assert.numEqual(await balanceOf(cToken.underlying, cToken._address), beforeProtocolCash.add(repayAmount));
          assert.hasLog(result, 'Transfer', {
            from: payer,
            to: cToken._address,
            amount: repayAmount.toString()
          });
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

    it("emits a repay borrow failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(repayBorrow(cToken, borrower, repayAmount), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      await setBalance(cToken.underlying, borrower, 1);
      assert.hasTokenFailure(
        await repayBorrow(cToken, borrower, repayAmount),
        'TOKEN_INSUFFICIENT_BALANCE',
        'REPAY_BORROW_TRANSFER_IN_NOT_POSSIBLE'
      );
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(cToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
      assert.success(await repayBorrow(cToken, borrower, repayAmount));
      const afterAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
      assert.numEqual(afterAccountBorrowSnap.principal, beforeAccountBorrowSnap.principal.sub(repayAmount));
    });

    it("repays the full amount owed if payer has enough", async () => {
      await fastForward(cToken);
      assert.success(await repayBorrow(cToken, borrower, -1));
      const afterAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
      assert.numEqual(afterAccountBorrowSnap.principal, 0);
    });

    it("fails gracefully if payer does not have enough", async () => {
      await setBalance(cToken.underlying, borrower, 3);
      await fastForward(cToken);
      assert.hasTokenFailure(
        await repayBorrow(cToken, borrower, -1),
        'TOKEN_INSUFFICIENT_BALANCE',
        'REPAY_BORROW_TRANSFER_IN_NOT_POSSIBLE'
      );
    });
  });

  describe('repayBorrowBehalf', async () => {
    const payer = benefactor;

    beforeEach(async () => {
      await preRepay(cToken, payer, borrower, repayAmount);
    });

    it("emits a repay borrow failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(repayBorrowBehalf(cToken, payer, borrower, repayAmount), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      await setBalance(cToken.underlying, payer, 1);
      assert.hasTokenFailure(
        await repayBorrowBehalf(cToken, payer, borrower, repayAmount),
        'TOKEN_INSUFFICIENT_BALANCE',
        'REPAY_BORROW_TRANSFER_IN_NOT_POSSIBLE'
      );
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
