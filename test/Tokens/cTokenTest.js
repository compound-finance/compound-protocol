const {
  etherUnsigned,
  etherMantissa,
  call,
  send
} = require('../Utils/MochaTruffle');

const {
  makeCToken,
  setBorrowRate,
  pretendBorrow
} = require('../Utils/Compound');

contract('CToken', function ([root, admin, ...accounts]) {
  describe('constructor', async () => {
    it("fails when non erc-20 underlying", async () => {
      await assert.revert(makeCToken({ underlying: { _address: root } }), "revert");
    });

    it("fails when 0 initial exchange rate", async () => {
      await assert.revert(makeCToken({ exchangeRate: 0 }), "revert initial exchange rate must be greater than zero.");
    });

    it("succeeds with erc-20 underlying and non-zero exchange rate", async () => {
      const cToken = await makeCToken();
      assert.equal(await call(cToken, 'underlying'), cToken.underlying._address);
      assert.equal(await call(cToken, 'admin'), root);
    });

    it("succeeds when setting admin to contructor argument", async () => {
      const cToken = await makeCToken({ admin: admin });
      assert.equal(await call(cToken, 'admin'), admin);
    });
  });

  describe('name, symbol, decimals', async () => {
    let cToken;
    before(async () => {
      cToken = await makeCToken({ name: "CToken Foo", symbol: "cFOO", decimals: 10 });
    });

    it('should return correct name', async () => {
      assert.equal(await call(cToken, 'name'), "CToken Foo");
    });

    it('should return correct symbol', async () => {
      assert.equal(await call(cToken, 'symbol'), "cFOO");
    });

    it('should return correct decimals', async () => {
      assert.equal(await call(cToken, 'decimals'), 10);
    });
  });

  describe('balanceOfUnderlying', () => {
    it("has an underlying balance", async () => {
      const cToken = await makeCToken({ supportMarket: true, exchangeRate: 2 });
      await send(cToken, 'harnessSetBalance', [root, 100]);
      assert.equal(await call(cToken, 'balanceOfUnderlying', [root]), 200);
    });
  });

  describe('borrowRatePerBlock', () => {
    it("has a borrow rate", async () => {
      const cToken = await makeCToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5 } });
      const perBlock = await call(cToken, 'borrowRatePerBlock');
      assert.approximately(perBlock * 2102400, 5e16, 1e8);
    });
  });

  describe('supplyRatePerBlock', () => {
    it("returns 0 if there's no supply", async () => {
      const cToken = await makeCToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5 } });
      const perBlock = await call(cToken, 'supplyRatePerBlock');
      await assert.equal(perBlock, 0);
    });

    it("has a supply rate", async () => {
      const baseRate = 0.05;
      const multiplier = 0.45;
      const kink = 0.95;
      const jump = 5;
      const cToken = await makeCToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate, multiplier, kink, jump } });
      await send(cToken, 'harnessSetReserveFactorFresh', [etherMantissa(.01)]);
      await send(cToken, 'harnessExchangeRateDetails', [1, 1, 0]);
      await send(cToken, 'harnessSetExchangeRate', [etherMantissa(1)]);
      // Full utilization (Over the kink so jump is included), 1% reserves
      const additionalJump = multiplier * jump * .05;
      const borrowRate = (kink * multiplier) + baseRate + additionalJump;
      const expectedSuplyRate = borrowRate * .99;

      const perBlock = await call(cToken, 'supplyRatePerBlock');
      assert.approximately(perBlock * 2102400, expectedSuplyRate * 1e18, 1e8);
    });
  });

  describe("borrowBalanceCurrent", async () => {
    const borrower = accounts[0];

    let cToken;
    before(async () => {
      cToken = await makeCToken();
    });

    beforeEach(async () => {
      await setBorrowRate(cToken, .001)
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
    });

    it("reverts if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(send(cToken, 'borrowBalanceCurrent', [borrower]), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns successful result from borrowBalanceStored with no interest", async () => {
      await setBorrowRate(cToken, 0);
      await pretendBorrow(cToken, borrower, 1, 1, 5e18);
      assert.equal(await call(cToken, 'borrowBalanceCurrent', [borrower]), 5e18)
    });

    it("returns successful result from borrowBalanceCurrent with no interest", async () => {
      await setBorrowRate(cToken, 0);
      await pretendBorrow(cToken, borrower, 1, 3, 5e18);
      assert.success(await send(cToken, 'harnessFastForward', [5]));
      assert.equal(await call(cToken, 'borrowBalanceCurrent', [borrower]), 5e18 * 3)
    });
  });

  describe("borrowBalanceStored", async () => {
    const borrower = accounts[0];

    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken({ comptrollerOpts: { kind: 'bool' } });
    });

    it("returns 0 for account with no borrows", async () => {
      assert.equal(await call(cToken, 'borrowBalanceStored', [borrower]), 0)
    });

    it("returns stored principal when account and market indexes are the same", async () => {
      await pretendBorrow(cToken, borrower, 1, 1, 5e18);
      assert.equal(await call(cToken, 'borrowBalanceStored', [borrower]), 5e18);
    });

    it("returns calculated balance when market index is higher than account index", async () => {
      await pretendBorrow(cToken, borrower, 1, 3, 5e18);
      assert.equal(await call(cToken, 'borrowBalanceStored', [borrower]), 5e18 * 3);
    });

    it("has undefined behavior when market index is lower than account index", async () => {
      // The market index < account index should NEVER happen, so we don't test this case
    });

    it("reverts on overflow of principal", async () => {
      await pretendBorrow(cToken, borrower, 1, 3, -1);
      await assert.revert(call(cToken, 'borrowBalanceStored', [borrower]), "revert borrowBalanceStored: borrowBalanceStoredInternal failed");
    });

    it("reverts on non-zero stored principal with zero account index", async () => {
      await pretendBorrow(cToken, borrower, 0, 3, 5);
      await assert.revert(call(cToken, 'borrowBalanceStored', [borrower]), "revert borrowBalanceStored: borrowBalanceStoredInternal failed");
    });
  });

  describe('exchangeRateStored', async () => {
    let cToken, exchangeRate = 2;
    beforeEach(async () => {
      cToken = await makeCToken({ exchangeRate });
    });

    it("returns initial exchange rate with zero cTokenSupply", async () => {
      const result = await call(cToken, 'exchangeRateStored');
      assert.equal(result, etherMantissa(exchangeRate), "exchange rate should be initial exchange rate");
    });

    it("calculates with single cTokenSupply and single total borrow", async () => {
      const cTokenSupply = 1, totalBorrows = 1, totalReserves = 0;
      await send(cToken, 'harnessExchangeRateDetails', [cTokenSupply, totalBorrows, totalReserves]);
      const result = await call(cToken, 'exchangeRateStored');
      assert.equal(result, etherMantissa(1), "exchange rate should be 1 to 1 (ie: 1e18)");
    });

    it("calculates with cTokenSupply and total borrows", async () => {
      const cTokenSupply = 100e18, totalBorrows = 10e18, totalReserves = 0;
      await send(cToken, 'harnessExchangeRateDetails', [cTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(cToken, 'exchangeRateStored');
      assert.equal(result, etherMantissa(.1), "exchange rate should be 0.1 (ie: 10e18 / 100e18)");
    });

    it("calculates with cash and cTokenSupply", async () => {
      const cTokenSupply = 5e18, totalBorrows = 0, totalReserves = 0;
      assert.success(await send(cToken.underlying, 'transfer', [cToken._address, etherMantissa(500)]));
      await send(cToken, 'harnessExchangeRateDetails', [cTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(cToken, 'exchangeRateStored');
      assert.equal(result, etherMantissa(100), "exchange rate should be 100 (ie: 500e18 / 5e18)");
    });

    it("calculates with cash, borrows, reserves and cTokenSupply", async () => {
      const cTokenSupply = 500e18, totalBorrows = 500e18, totalReserves = 5e18;
      assert.success(await send(cToken.underlying, 'transfer', [cToken._address, etherMantissa(500)]));
      await send(cToken, 'harnessExchangeRateDetails', [cTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(cToken, 'exchangeRateStored');
      assert.equal(result, etherMantissa(1.99), "exchange rate should be 1.99 (ie: (500e18 + 500e18 - 5e18) / 500e18)");
    });
  });

  describe('getCash', async () => {
    it("gets the cash", async () => {
      const cToken = await makeCToken();
      const result = await call(cToken, 'getCash');
      assert.equal(result, 0);
    });
  });
});
