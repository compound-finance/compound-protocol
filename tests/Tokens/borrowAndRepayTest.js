const {
  etherUnsigned,
  etherMantissa,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeVToken,
  balanceOf,
  borrowSnapshot,
  totalBorrows,
  fastForward,
  setBalance,
  preApprove,
  pretendBorrow
} = require('../Utils/Vortex');

const borrowAmount = etherUnsigned(10e3);
const repayAmount = etherUnsigned(10e2);

async function preBorrow(vToken, borrower, borrowAmount) {
  await send(vToken.controller, 'setBorrowAllowed', [true]);
  await send(vToken.controller, 'setBorrowVerify', [true]);
  await send(vToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(vToken.underlying, 'harnessSetBalance', [vToken._address, borrowAmount]);
  await send(vToken, 'harnessSetFailTransferToAddress', [borrower, false]);
  await send(vToken, 'harnessSetAccountBorrows', [borrower, 0, 0]);
  await send(vToken, 'harnessSetTotalBorrows', [0]);
}

async function borrowFresh(vToken, borrower, borrowAmount) {
  return send(vToken, 'harnessBorrowFresh', [borrower, borrowAmount]);
}

async function borrow(vToken, borrower, borrowAmount, opts = {}) {
  // make sure to have a block delta so we accrue interest
  await send(vToken, 'harnessFastForward', [1]);
  return send(vToken, 'borrow', [borrowAmount], {from: borrower});
}

async function preRepay(vToken, benefactor, borrower, repayAmount) {
  // setup either benefactor OR borrower for success in repaying
  await send(vToken.controller, 'setRepayBorrowAllowed', [true]);
  await send(vToken.controller, 'setRepayBorrowVerify', [true]);
  await send(vToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(vToken.underlying, 'harnessSetFailTransferFromAddress', [benefactor, false]);
  await send(vToken.underlying, 'harnessSetFailTransferFromAddress', [borrower, false]);
  await pretendBorrow(vToken, borrower, 1, 1, repayAmount);
  await preApprove(vToken, benefactor, repayAmount);
  await preApprove(vToken, borrower, repayAmount);
}

async function repayBorrowFresh(vToken, payer, borrower, repayAmount) {
  return send(vToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: payer});
}

async function repayBorrow(vToken, borrower, repayAmount) {
  // make sure to have a block delta so we accrue interest
  await send(vToken, 'harnessFastForward', [1]);
  return send(vToken, 'repayBorrow', [repayAmount], {from: borrower});
}

async function repayBorrowBehalf(vToken, payer, borrower, repayAmount) {
  // make sure to have a block delta so we accrue interest
  await send(vToken, 'harnessFastForward', [1]);
  return send(vToken, 'repayBorrowBehalf', [borrower, repayAmount], {from: payer});
}

describe('VToken', function () {
  let vToken, root, borrower, benefactor, accounts;
  beforeEach(async () => {
    [root, borrower, benefactor, ...accounts] = saddle.accounts;
    vToken = await makeVToken({controllerOpts: {kind: 'bool'}});
  });

  describe('borrowFresh', () => {
    beforeEach(async () => await preBorrow(vToken, borrower, borrowAmount));

    it("fails if controller tells it to", async () => {
      await send(vToken.controller, 'setBorrowAllowed', [false]);
      expect(await borrowFresh(vToken, borrower, borrowAmount)).toHaveTrollReject('BORROW_CONTROLLER_REJECTION');
    });

    it("proceeds if controller tells it to", async () => {
      await expect(await borrowFresh(vToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if market not fresh", async () => {
      await fastForward(vToken);
      expect(await borrowFresh(vToken, borrower, borrowAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'BORROW_FRESHNESS_CHECK');
    });

    it("continues if fresh", async () => {
      await expect(await send(vToken, 'accrueInterest')).toSucceed();
      await expect(await borrowFresh(vToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if error if protocol has less than borrowAmount of underlying", async () => {
      expect(await borrowFresh(vToken, borrower, borrowAmount.plus(1))).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'BORROW_CASH_NOT_AVAILABLE');
    });

    it("fails if borrowBalanceStored fails (due to non-zero stored principal with zero account index)", async () => {
      await pretendBorrow(vToken, borrower, 0, 3e18, 5e18);
      expect(await borrowFresh(vToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_ACCUMULATED_BALANCE_CALCULATION_FAILED');
    });

    it("fails if calculating account new total borrow balance overflows", async () => {
      await pretendBorrow(vToken, borrower, 1e-18, 1e-18, UInt256Max());
      expect(await borrowFresh(vToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED');
    });

    it("fails if calculation of new total borrow balance overflows", async () => {
      await send(vToken, 'harnessSetTotalBorrows', [UInt256Max()]);
      expect(await borrowFresh(vToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED');
    });

    it("reverts if transfer out fails", async () => {
      await send(vToken, 'harnessSetFailTransferToAddress', [borrower, true]);
      await expect(borrowFresh(vToken, borrower, borrowAmount)).rejects.toRevert("revert TOKEN_TRANSFER_OUT_FAILED");
    });

    xit("reverts if borrowVerify fails", async() => {
      await send(vToken.controller, 'setBorrowVerify', [false]);
      await expect(borrowFresh(vToken, borrower, borrowAmount)).rejects.toRevert("revert borrowVerify rejected borrow");
    });

    it("transfers the underlying cash, tokens, and emits Transfer, Borrow events", async () => {
      const beforeProtocolCash = await balanceOf(vToken.underlying, vToken._address);
      const beforeProtocolBorrows = await totalBorrows(vToken);
      const beforeAccountCash = await balanceOf(vToken.underlying, borrower);
      const result = await borrowFresh(vToken, borrower, borrowAmount);
      expect(result).toSucceed();
      expect(await balanceOf(vToken.underlying, borrower)).toEqualNumber(beforeAccountCash.plus(borrowAmount));
      expect(await balanceOf(vToken.underlying, vToken._address)).toEqualNumber(beforeProtocolCash.minus(borrowAmount));
      expect(await totalBorrows(vToken)).toEqualNumber(beforeProtocolBorrows.plus(borrowAmount));
      expect(result).toHaveLog('Transfer', {
        from: vToken._address,
        to: borrower,
        amount: borrowAmount.toString()
      });
      expect(result).toHaveLog('Borrow', {
        borrower: borrower,
        borrowAmount: borrowAmount.toString(),
        accountBorrows: borrowAmount.toString(),
        totalBorrows: beforeProtocolBorrows.plus(borrowAmount).toString()
      });
    });

    it("stores new borrow principal and interest index", async () => {
      const beforeProtocolBorrows = await totalBorrows(vToken);
      await pretendBorrow(vToken, borrower, 0, 3, 0);
      await borrowFresh(vToken, borrower, borrowAmount);
      const borrowSnap = await borrowSnapshot(vToken, borrower);
      expect(borrowSnap.principal).toEqualNumber(borrowAmount);
      expect(borrowSnap.interestIndex).toEqualNumber(etherMantissa(3));
      expect(await totalBorrows(vToken)).toEqualNumber(beforeProtocolBorrows.plus(borrowAmount));
    });
  });

  describe('borrow', () => {
    beforeEach(async () => await preBorrow(vToken, borrower, borrowAmount));

    it("emits a borrow failure if interest accrual fails", async () => {
      await send(vToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(borrow(vToken, borrower, borrowAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from borrowFresh without emitting any extra logs", async () => {
      expect(await borrow(vToken, borrower, borrowAmount.plus(1))).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'BORROW_CASH_NOT_AVAILABLE');
    });

    it("returns success from borrowFresh and transfers the correct amount", async () => {
      const beforeAccountCash = await balanceOf(vToken.underlying, borrower);
      await fastForward(vToken);
      expect(await borrow(vToken, borrower, borrowAmount)).toSucceed();
      expect(await balanceOf(vToken.underlying, borrower)).toEqualNumber(beforeAccountCash.plus(borrowAmount));
    });
  });

  describe('repayBorrowFresh', () => {
    [true, false].forEach((benefactorIsPayer) => {
      let payer;
      const label = benefactorIsPayer ? "benefactor paying" : "borrower paying";
      describe(label, () => {
        beforeEach(async () => {
          payer = benefactorIsPayer ? benefactor : borrower;
          await preRepay(vToken, payer, borrower, repayAmount);
        });

        it("fails if repay is not allowed", async () => {
          await send(vToken.controller, 'setRepayBorrowAllowed', [false]);
          expect(await repayBorrowFresh(vToken, payer, borrower, repayAmount)).toHaveTrollReject('REPAY_BORROW_CONTROLLER_REJECTION', 'MATH_ERROR');
        });

        it("fails if block number ≠ current block number", async () => {
          await fastForward(vToken);
          expect(await repayBorrowFresh(vToken, payer, borrower, repayAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'REPAY_BORROW_FRESHNESS_CHECK');
        });

        it("fails if insufficient approval", async() => {
          await preApprove(vToken, payer, 1);
          await expect(repayBorrowFresh(vToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient allowance');
        });

        it("fails if insufficient balance", async() => {
          await setBalance(vToken.underlying, payer, 1);
          await expect(repayBorrowFresh(vToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
        });


        it("returns an error if calculating account new account borrow balance fails", async () => {
          await pretendBorrow(vToken, borrower, 1, 1, 1);
          await expect(repayBorrowFresh(vToken, payer, borrower, repayAmount)).rejects.toRevert("revert REPAY_BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED");
        });

        it("returns an error if calculation of new total borrow balance fails", async () => {
          await send(vToken, 'harnessSetTotalBorrows', [1]);
          await expect(repayBorrowFresh(vToken, payer, borrower, repayAmount)).rejects.toRevert("revert REPAY_BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED");
        });


        it("reverts if doTransferIn fails", async () => {
          await send(vToken.underlying, 'harnessSetFailTransferFromAddress', [payer, true]);
          await expect(repayBorrowFresh(vToken, payer, borrower, repayAmount)).rejects.toRevert("revert TOKEN_TRANSFER_IN_FAILED");
        });

        xit("reverts if repayBorrowVerify fails", async() => {
          await send(vToken.controller, 'setRepayBorrowVerify', [false]);
          await expect(repayBorrowFresh(vToken, payer, borrower, repayAmount)).rejects.toRevert("revert repayBorrowVerify rejected repayBorrow");
        });

        it("transfers the underlying cash, and emits Transfer, RepayBorrow events", async () => {
          const beforeProtocolCash = await balanceOf(vToken.underlying, vToken._address);
          const result = await repayBorrowFresh(vToken, payer, borrower, repayAmount);
          expect(await balanceOf(vToken.underlying, vToken._address)).toEqualNumber(beforeProtocolCash.plus(repayAmount));
          expect(result).toHaveLog('Transfer', {
            from: payer,
            to: vToken._address,
            amount: repayAmount.toString()
          });
          expect(result).toHaveLog('RepayBorrow', {
            payer: payer,
            borrower: borrower,
            repayAmount: repayAmount.toString(),
            accountBorrows: "0",
            totalBorrows: "0"
          });
        });

        it("stores new borrow principal and interest index", async () => {
          const beforeProtocolBorrows = await totalBorrows(vToken);
          const beforeAccountBorrowSnap = await borrowSnapshot(vToken, borrower);
          expect(await repayBorrowFresh(vToken, payer, borrower, repayAmount)).toSucceed();
          const afterAccountBorrows = await borrowSnapshot(vToken, borrower);
          expect(afterAccountBorrows.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
          expect(afterAccountBorrows.interestIndex).toEqualNumber(etherMantissa(1));
          expect(await totalBorrows(vToken)).toEqualNumber(beforeProtocolBorrows.minus(repayAmount));
        });
      });
    });
  });

  describe('repayBorrow', () => {
    beforeEach(async () => {
      await preRepay(vToken, borrower, borrower, repayAmount);
    });

    it("emits a repay borrow failure if interest accrual fails", async () => {
      await send(vToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrow(vToken, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      await setBalance(vToken.underlying, borrower, 1);
      await expect(repayBorrow(vToken, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(vToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(vToken, borrower);
      expect(await repayBorrow(vToken, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(vToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });

    it("repays the full amount owed if payer has enough", async () => {
      await fastForward(vToken);
      expect(await repayBorrow(vToken, borrower, UInt256Max())).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(vToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(0);
    });

    it("fails gracefully if payer does not have enough", async () => {
      await setBalance(vToken.underlying, borrower, 3);
      await fastForward(vToken);
      await expect(repayBorrow(vToken, borrower, UInt256Max())).rejects.toRevert('revert Insufficient balance');
    });
  });

  describe('repayBorrowBehalf', () => {
    let payer;

    beforeEach(async () => {
      payer = benefactor;
      await preRepay(vToken, payer, borrower, repayAmount);
    });

    it("emits a repay borrow failure if interest accrual fails", async () => {
      await send(vToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrowBehalf(vToken, payer, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      await setBalance(vToken.underlying, payer, 1);
      await expect(repayBorrowBehalf(vToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(vToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(vToken, borrower);
      expect(await repayBorrowBehalf(vToken, payer, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(vToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });
  });
});
