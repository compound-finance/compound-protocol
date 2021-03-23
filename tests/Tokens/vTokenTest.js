const {
  etherUnsigned,
  etherMantissa,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeVToken,
  setBorrowRate,
  pretendBorrow
} = require('../Utils/Vortex');

describe('VToken', function () {
  let root, admin, accounts;
  beforeEach(async () => {
    [root, admin, ...accounts] = saddle.accounts;
  });

  describe('constructor', () => {
    it("fails when non erc-20 underlying", async () => {
      await expect(makeVToken({ underlying: { _address: root } })).rejects.toRevert("revert");
    });

    it("fails when 0 initial exchange rate", async () => {
      await expect(makeVToken({ exchangeRate: 0 })).rejects.toRevert("revert initial exchange rate must be greater than zero.");
    });

    it("succeeds with erc-20 underlying and non-zero exchange rate", async () => {
      const vToken = await makeVToken();
      expect(await call(vToken, 'underlying')).toEqual(vToken.underlying._address);
      expect(await call(vToken, 'admin')).toEqual(root);
    });

    it("succeeds when setting admin to contructor argument", async () => {
      const vToken = await makeVToken({ admin: admin });
      expect(await call(vToken, 'admin')).toEqual(admin);
    });
  });

  describe('name, symbol, decimals', () => {
    let vToken;

    beforeEach(async () => {
      vToken = await makeVToken({ name: "VToken Foo", symbol: "cFOO", decimals: 10 });
    });

    it('should return correct name', async () => {
      expect(await call(vToken, 'name')).toEqual("VToken Foo");
    });

    it('should return correct symbol', async () => {
      expect(await call(vToken, 'symbol')).toEqual("cFOO");
    });

    it('should return correct decimals', async () => {
      expect(await call(vToken, 'decimals')).toEqualNumber(10);
    });
  });

  describe('balanceOfUnderlying', () => {
    it("has an underlying balance", async () => {
      const vToken = await makeVToken({ supportMarket: true, exchangeRate: 2 });
      await send(vToken, 'harnessSetBalance', [root, 100]);
      expect(await call(vToken, 'balanceOfUnderlying', [root])).toEqualNumber(200);
    });
  });

  describe('borrowRatePerBlock', () => {
    it("has a borrow rate", async () => {
      const vToken = await makeVToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5 } });
      const perBlock = await call(vToken, 'borrowRatePerBlock');
      expect(Math.abs(perBlock * 2102400 - 5e16)).toBeLessThanOrEqual(1e8);
    });
  });

  describe('supplyRatePerBlock', () => {
    it("returns 0 if there's no supply", async () => {
      const vToken = await makeVToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5 } });
      const perBlock = await call(vToken, 'supplyRatePerBlock');
      await expect(perBlock).toEqualNumber(0);
    });

    it("has a supply rate", async () => {
      const baseRate = 0.05;
      const multiplier = 0.45;
      const kink = 0.95;
      const jump = 5 * multiplier;
      const vToken = await makeVToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate, multiplier, kink, jump } });
      await send(vToken, 'harnessSetReserveFactorFresh', [etherMantissa(.01)]);
      await send(vToken, 'harnessExchangeRateDetails', [1, 1, 0]);
      await send(vToken, 'harnessSetExchangeRate', [etherMantissa(1)]);
      // Full utilization (Over the kink so jump is included), 1% reserves
      const borrowRate = baseRate + multiplier * kink + jump * .05;
      const expectedSuplyRate = borrowRate * .99;

      const perBlock = await call(vToken, 'supplyRatePerBlock');
      expect(Math.abs(perBlock * 2102400 - expectedSuplyRate * 1e18)).toBeLessThanOrEqual(1e8);
    });
  });

  describe("borrowBalanceCurrent", () => {
    let borrower;
    let vToken;

    beforeEach(async () => {
      borrower = accounts[0];
      vToken = await makeVToken();
    });

    beforeEach(async () => {
      await setBorrowRate(vToken, .001)
      await send(vToken.interestRateModel, 'setFailBorrowRate', [false]);
    });

    it("reverts if interest accrual fails", async () => {
      await send(vToken.interestRateModel, 'setFailBorrowRate', [true]);
      // make sure we accrue interest
      await send(vToken, 'harnessFastForward', [1]);
      await expect(send(vToken, 'borrowBalanceCurrent', [borrower])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns successful result from borrowBalanceStored with no interest", async () => {
      await setBorrowRate(vToken, 0);
      await pretendBorrow(vToken, borrower, 1, 1, 5e18);
      expect(await call(vToken, 'borrowBalanceCurrent', [borrower])).toEqualNumber(5e18)
    });

    it("returns successful result from borrowBalanceCurrent with no interest", async () => {
      await setBorrowRate(vToken, 0);
      await pretendBorrow(vToken, borrower, 1, 3, 5e18);
      expect(await send(vToken, 'harnessFastForward', [5])).toSucceed();
      expect(await call(vToken, 'borrowBalanceCurrent', [borrower])).toEqualNumber(5e18 * 3)
    });
  });

  describe("borrowBalanceStored", () => {
    let borrower;
    let vToken;

    beforeEach(async () => {
      borrower = accounts[0];
      vToken = await makeVToken({ controllerOpts: { kind: 'bool' } });
    });

    it("returns 0 for account with no borrows", async () => {
      expect(await call(vToken, 'borrowBalanceStored', [borrower])).toEqualNumber(0)
    });

    it("returns stored principal when account and market indexes are the same", async () => {
      await pretendBorrow(vToken, borrower, 1, 1, 5e18);
      expect(await call(vToken, 'borrowBalanceStored', [borrower])).toEqualNumber(5e18);
    });

    it("returns calculated balance when market index is higher than account index", async () => {
      await pretendBorrow(vToken, borrower, 1, 3, 5e18);
      expect(await call(vToken, 'borrowBalanceStored', [borrower])).toEqualNumber(5e18 * 3);
    });

    it("has undefined behavior when market index is lower than account index", async () => {
      // The market index < account index should NEVER happen, so we don't test this case
    });

    it("reverts on overflow of principal", async () => {
      await pretendBorrow(vToken, borrower, 1, 3, UInt256Max());
      await expect(call(vToken, 'borrowBalanceStored', [borrower])).rejects.toRevert("revert borrowBalanceStored: borrowBalanceStoredInternal failed");
    });

    it("reverts on non-zero stored principal with zero account index", async () => {
      await pretendBorrow(vToken, borrower, 0, 3, 5);
      await expect(call(vToken, 'borrowBalanceStored', [borrower])).rejects.toRevert("revert borrowBalanceStored: borrowBalanceStoredInternal failed");
    });
  });

  describe('exchangeRateStored', () => {
    let vToken, exchangeRate = 2;

    beforeEach(async () => {
      vToken = await makeVToken({ exchangeRate });
    });

    it("returns initial exchange rate with zero vTokenSupply", async () => {
      const result = await call(vToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(exchangeRate));
    });

    it("calculates with single vTokenSupply and single total borrow", async () => {
      const vTokenSupply = 1, totalBorrows = 1, totalReserves = 0;
      await send(vToken, 'harnessExchangeRateDetails', [vTokenSupply, totalBorrows, totalReserves]);
      const result = await call(vToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(1));
    });

    it("calculates with vTokenSupply and total borrows", async () => {
      const vTokenSupply = 100e18, totalBorrows = 10e18, totalReserves = 0;
      await send(vToken, 'harnessExchangeRateDetails', [vTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(vToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(.1));
    });

    it("calculates with cash and vTokenSupply", async () => {
      const vTokenSupply = 5e18, totalBorrows = 0, totalReserves = 0;
      expect(
        await send(vToken.underlying, 'transfer', [vToken._address, etherMantissa(500)])
      ).toSucceed();
      await send(vToken, 'harnessExchangeRateDetails', [vTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(vToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(100));
    });

    it("calculates with cash, borrows, reserves and vTokenSupply", async () => {
      const vTokenSupply = 500e18, totalBorrows = 500e18, totalReserves = 5e18;
      expect(
        await send(vToken.underlying, 'transfer', [vToken._address, etherMantissa(500)])
      ).toSucceed();
      await send(vToken, 'harnessExchangeRateDetails', [vTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(vToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(1.99));
    });
  });

  describe('getCash', () => {
    it("gets the cash", async () => {
      const vToken = await makeVToken();
      const result = await call(vToken, 'getCash');
      expect(result).toEqualNumber(0);
    });
  });
});
