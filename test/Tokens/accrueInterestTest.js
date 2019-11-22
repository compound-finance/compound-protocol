const {
  etherMantissa,
  etherUnsigned,
  call,
  send
} = require('../Utils/MochaTruffle');
const {
  makeCToken,
  setBorrowRate
} = require('../Utils/Compound');

const blockNumber = 2e7;
const borrowIndex = 1e18;
const borrowRate = .000001;

async function pretendBlock(cToken, accrualBlock = blockNumber, deltaBlocks = 1) {
  await send(cToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(blockNumber)]);
  await send(cToken, 'harnessSetBlockNumber', [etherUnsigned(blockNumber + deltaBlocks)]);
  await send(cToken, 'harnessSetBorrowIndex', [etherUnsigned(borrowIndex)]);
}

async function preAccrue(cToken) {
  await pretendBlock(cToken, blockNumber, 0);
  await setBorrowRate(cToken, borrowRate);
  await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(cToken, 'harnessExchangeRateDetails', [0, 0, 0]);
}

contract('CToken', function ([root, ...accounts]) {
  let cToken;
  before(async () => {
    cToken = await makeCToken({comptrollerOpts: {kind: 'bool'}});
  });

  beforeEach(async () => {
    await preAccrue(cToken);
  });

  describe('accrueInterest', async () => {
    it('reverts if the interest rate is absurdly high', async () => {
      assert.numEqual(await call(cToken, 'getBorrowRateMaxMantissa'), etherMantissa(0.000005)); // 0.0005% per block
      await setBorrowRate(cToken, 0.001e-2);                                                    // 0.0010% per block
      await assert.revert(send(cToken, 'accrueInterest'), "revert borrow rate is absurdly high");
    });

    it('fails if new borrow rate calculation fails', async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(send(cToken, 'accrueInterest'), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it('fails if simple interest factor calculation fails', async () => {
      await pretendBlock(cToken, blockNumber, 5e70);
      assert.hasTokenFailure(
        await send(cToken, 'accrueInterest'),
        'MATH_ERROR',
        'ACCRUE_INTEREST_SIMPLE_INTEREST_FACTOR_CALCULATION_FAILED'
      );
    });

    it('fails if new borrow index calculation fails', async () => {
      await pretendBlock(cToken, blockNumber, 5e60);
      assert.hasTokenFailure(
        await send(cToken, 'accrueInterest'),
        'MATH_ERROR',
        'ACCRUE_INTEREST_NEW_BORROW_INDEX_CALCULATION_FAILED'
      );
    });

    it('fails if new borrow interest index calculation fails', async () => {
      await pretendBlock(cToken)
      await send(cToken, 'harnessSetBorrowIndex', [-1]);
      assert.hasTokenFailure(
        await send(cToken, 'accrueInterest'),
        'MATH_ERROR',
        'ACCRUE_INTEREST_NEW_BORROW_INDEX_CALCULATION_FAILED'
      );
    });

    it('fails if interest accumulated calculation fails', async () => {
      await send(cToken, 'harnessExchangeRateDetails', [0, -1, 0]);
      await pretendBlock(cToken)
      assert.hasTokenFailure(
        await send(cToken, 'accrueInterest'),
        'MATH_ERROR',
        'ACCRUE_INTEREST_ACCUMULATED_INTEREST_CALCULATION_FAILED'
      );
    });

    it('fails if new total borrows calculation fails', async () => {
      await setBorrowRate(cToken, 1e-18);
      await pretendBlock(cToken)
      await send(cToken, 'harnessExchangeRateDetails', [0, -1, 0]);
      assert.hasTokenFailure(
        await send(cToken, 'accrueInterest'),
        'MATH_ERROR',
        'ACCRUE_INTEREST_NEW_TOTAL_BORROWS_CALCULATION_FAILED'
      );
    });

    it('fails if interest accumulated for reserves calculation fails', async () => {
      await setBorrowRate(cToken, .000001);
      await send(cToken, 'harnessExchangeRateDetails', [0, etherUnsigned(1e30), -1]);
      await send(cToken, 'harnessSetReserveFactorFresh', [etherUnsigned(1e10)]);
      await pretendBlock(cToken, blockNumber, 5e20)
      assert.hasTokenFailure(
        await send(cToken, 'accrueInterest'),
        'MATH_ERROR',
        'ACCRUE_INTEREST_NEW_TOTAL_RESERVES_CALCULATION_FAILED'
      );
    });

    it('fails if new total reserves calculation fails', async () => {
      await setBorrowRate(cToken, 1e-18);
      await send(cToken, 'harnessExchangeRateDetails', [0, etherUnsigned(1e56), -1]);
      await send(cToken, 'harnessSetReserveFactorFresh', [etherUnsigned(1e17)]);
      await pretendBlock(cToken)
      assert.hasTokenFailure(
        await send(cToken, 'accrueInterest'),
        'MATH_ERROR',
        'ACCRUE_INTEREST_NEW_TOTAL_RESERVES_CALCULATION_FAILED'
      );
    });

    it('succeeds and saves updated values in storage on success', async () => {
      const startingTotalBorrows = 1e22;
      const startingTotalReserves = 1e20;
      const reserveFactor = 1e17;

      await send(cToken, 'harnessExchangeRateDetails', [0, etherUnsigned(startingTotalBorrows), etherUnsigned(startingTotalReserves)]);
      await send(cToken, 'harnessSetReserveFactorFresh', [etherUnsigned(reserveFactor)]);
      await pretendBlock(cToken)

      const expectedAccrualBlockNumber = blockNumber + 1;
      const expectedBorrowIndex = borrowIndex + borrowIndex * borrowRate;
      const expectedTotalBorrows = startingTotalBorrows + startingTotalBorrows * borrowRate;
      const expectedTotalReserves = startingTotalReserves + startingTotalBorrows *  borrowRate * reserveFactor / 1e18;

      const receipt = await send(cToken, 'accrueInterest')
      assert.success(receipt);
      assert.hasLog(receipt, 'AccrueInterest', {
        cashPrior: 0,
        interestAccumulated: etherUnsigned(expectedTotalBorrows).sub(etherUnsigned(startingTotalBorrows)),
        borrowIndex: expectedBorrowIndex,
        totalBorrows: expectedTotalBorrows
      }, true);
      assert.equal(await call(cToken, 'accrualBlockNumber'), expectedAccrualBlockNumber);
      assert.equal(await call(cToken, 'borrowIndex'), expectedBorrowIndex);
      assert.equal(await call(cToken, 'totalBorrows'), expectedTotalBorrows);
      assert.equal(await call(cToken, 'totalReserves'), expectedTotalReserves);
    });
  });
});
