const {
  etherGasCost,
  etherUnsigned,
  etherMantissa,
  UInt256Max,
  etherExp
} = require('../Utils/Ethereum');

const {
  makeCToken,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  pretendBorrow,
  preApprove,
  enterMarkets
} = require('../Utils/Compound');

const repayAmount = etherExp(10);
const seizeTokens = repayAmount.multipliedBy(4); // forced

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
  await send(cTokenCollateral, 'harnessSetTotalSupply', [etherExp(10)]);
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
  // make sure to have a block delta so we accrue interest
  await fastForward(cToken, 1);
  await fastForward(cTokenCollateral, 1);
  return send(cToken, 'liquidateBorrow', [borrower, repayAmount, cTokenCollateral._address], {from: liquidator});
}

async function seize(cToken, liquidator, borrower, seizeAmount) {
  return send(cToken, 'seize', [liquidator, borrower, seizeAmount]);
}

describe('CToken', function () {
  let root, liquidator, borrower, accounts;
  let cToken, cTokenCollateral;

  const protocolSeizeShareMantissa = 2.8e16; // 2.8%
  const exchangeRate = etherExp(.2);

  const protocolShareTokens = seizeTokens.multipliedBy(protocolSeizeShareMantissa).dividedBy(etherExp(1));
  const liquidatorShareTokens = seizeTokens.minus(protocolShareTokens);

  const addReservesAmount = protocolShareTokens.multipliedBy(exchangeRate).dividedBy(etherExp(1));

  beforeEach(async () => {
    [root, liquidator, borrower, ...accounts] = saddle.accounts;
    cToken = await makeCToken({comptrollerOpts: {kind: 'bool'}});
    cTokenCollateral = await makeCToken({comptroller: cToken.comptroller});
    expect(await send(cTokenCollateral, 'harnessSetExchangeRate', [exchangeRate])).toSucceed();
  });

  beforeEach(async () => {
    await preLiquidate(cToken, liquidator, borrower, repayAmount, cTokenCollateral);
  });

  describe('liquidateBorrowFresh', () => {
    it("fails if comptroller tells it to", async () => {
      await send(cToken.comptroller, 'setLiquidateBorrowAllowed', [false]);
      await expect(liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral))
        .rejects.toRevertWithCustomError('LiquidateComptrollerRejection', [11]);
    });

    it("proceeds if comptroller tells it to", async () => {
      expect(
        await liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral)
      ).toSucceed();
    });

    it("fails if market not fresh", async () => {
      await fastForward(cToken);
      await expect(liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral))
        .rejects.toRevertWithCustomError('LiquidateFreshnessCheck');
    });

    it("fails if collateral market not fresh", async () => {
      await fastForward(cToken);
      await fastForward(cTokenCollateral);
      await send(cToken, 'accrueInterest');
      await expect(liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral))
        .rejects.toRevertWithCustomError('LiquidateCollateralFreshnessCheck');
    });

    it("fails if borrower is equal to liquidator", async () => {
      await expect(liquidateFresh(cToken, borrower, borrower, repayAmount, cTokenCollateral))
        .rejects.toRevertWithCustomError('LiquidateLiquidatorIsBorrower');
    });

    it("fails if repayAmount = 0", async () => {
      await expect(liquidateFresh(cToken, liquidator, borrower, 0, cTokenCollateral))
        .rejects.toRevertWithCustomError('LiquidateCloseAmountIsZero');
    });

    it("fails if calculating seize tokens fails and does not adjust balances", async () => {
      const beforeBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      await send(cToken.comptroller, 'setFailCalculateSeizeTokens', [true]);
      await expect(
        liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral)
      ).rejects.toRevert('revert LIQUIDATE_COMPTROLLER_CALCULATE_AMOUNT_SEIZE_FAILED');
      const afterBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      expect(afterBalances).toEqual(beforeBalances);
    });

    it("fails if repay fails", async () => {
      await send(cToken.comptroller, 'setRepayBorrowAllowed', [false]);
      await expect(liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral))
        .rejects.toRevertWithCustomError('RepayBorrowComptrollerRejection', [11]);
    });

    it("reverts if seize fails", async () => {
      await send(cToken.comptroller, 'setSeizeAllowed', [false]);
      await expect(
        liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral)
      ).rejects.toRevertWithCustomError('LiquidateSeizeComptrollerRejection', [11]);
    });

    xit("reverts if liquidateBorrowVerify fails", async() => {
      await send(cToken.comptroller, 'setLiquidateBorrowVerify', [false]);
      await expect(
        liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral)
      ).rejects.toRevert("revert liquidateBorrowVerify rejected liquidateBorrow");
    });

    it("transfers the cash, borrows, tokens, and emits Transfer, LiquidateBorrow events", async () => {
      const beforeBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      const result = await liquidateFresh(cToken, liquidator, borrower, repayAmount, cTokenCollateral);
      const afterBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog('LiquidateBorrow', {
        liquidator: liquidator,
        borrower: borrower,
        repayAmount: repayAmount.toString(),
        cTokenCollateral: cTokenCollateral._address,
        seizeTokens: seizeTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 0], {
        from: liquidator,
        to: cToken._address,
        amount: repayAmount.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: borrower,
        to: liquidator,
        amount: liquidatorShareTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 2], {
        from: borrower,
        to: cTokenCollateral._address,
        amount: protocolShareTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [cToken, 'cash', repayAmount],
        [cToken, 'borrows', -repayAmount],
        [cToken, liquidator, 'cash', -repayAmount],
        [cTokenCollateral, liquidator, 'tokens', liquidatorShareTokens],
        [cToken, borrower, 'borrows', -repayAmount],
        [cTokenCollateral, borrower, 'tokens', -seizeTokens],
        [cTokenCollateral, cTokenCollateral._address, 'reserves', addReservesAmount],
        [cTokenCollateral, cTokenCollateral._address, 'tokens', -protocolShareTokens]
      ]));
    });
  });

  describe('liquidateBorrow', () => {
    it("emits a liquidation failure if borrowed asset interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(cToken, liquidator, borrower, repayAmount, cTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("emits a liquidation failure if collateral asset interest accrual fails", async () => {
      await send(cTokenCollateral.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(cToken, liquidator, borrower, repayAmount, cTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from liquidateBorrowFresh without emitting any extra logs", async () => {
      await expect(liquidate(cToken, liquidator, borrower, 0, cTokenCollateral)).rejects.toRevertWithCustomError('LiquidateCloseAmountIsZero');
    });

    it("returns success from liquidateBorrowFresh and transfers the correct amounts", async () => {
      const beforeBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      const result = await liquidate(cToken, liquidator, borrower, repayAmount, cTokenCollateral);
      const gasCost = await etherGasCost(result);
      const afterBalances = await getBalances([cToken, cTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [cToken, 'cash', repayAmount],
        [cToken, 'borrows', -repayAmount],
        [cToken, liquidator, 'eth', -gasCost],
        [cToken, liquidator, 'cash', -repayAmount],
        [cTokenCollateral, liquidator, 'eth', -gasCost],
        [cTokenCollateral, liquidator, 'tokens', liquidatorShareTokens],
        [cTokenCollateral, cTokenCollateral._address, 'reserves', addReservesAmount],
        [cToken, borrower, 'borrows', -repayAmount],
        [cTokenCollateral, borrower, 'tokens', -seizeTokens],
        [cTokenCollateral, cTokenCollateral._address, 'tokens', -protocolShareTokens], // total supply decreases
      ]));
    });
  });

  describe('seize', () => {
    // XXX verify callers are properly checked

    it("fails if seize is not allowed", async () => {
      await send(cToken.comptroller, 'setSeizeAllowed', [false]);
      await expect(seize(cTokenCollateral, liquidator, borrower, seizeTokens)).rejects.toRevertWithCustomError('LiquidateSeizeComptrollerRejection', [11]);
    });

    it("fails if cTokenBalances[borrower] < amount", async () => {
      await setBalance(cTokenCollateral, borrower, 1);
      await expect(seize(cTokenCollateral, liquidator, borrower, seizeTokens)).rejects.toRevert();
    });

    it("fails if cTokenBalances[liquidator] overflows", async () => {
      await setBalance(cTokenCollateral, liquidator, UInt256Max());
      await expect(seize(cTokenCollateral, liquidator, borrower, seizeTokens)).rejects.toRevert();
    });

    it("succeeds, updates balances, adds to reserves, and emits Transfer and ReservesAdded events", async () => {
      const beforeBalances = await getBalances([cTokenCollateral], [liquidator, borrower]);
      const result = await seize(cTokenCollateral, liquidator, borrower, seizeTokens);
      const afterBalances = await getBalances([cTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog(['Transfer', 0], {
        from: borrower,
        to: liquidator,
        amount: liquidatorShareTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: borrower,
        to: cTokenCollateral._address,
        amount: protocolShareTokens.toString()
      });
      expect(result).toHaveLog('ReservesAdded', {
        benefactor: cTokenCollateral._address,
        addAmount: addReservesAmount.toString(),
        newTotalReserves: addReservesAmount.toString()
      });

      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [cTokenCollateral, liquidator, 'tokens', liquidatorShareTokens],
        [cTokenCollateral, borrower, 'tokens', -seizeTokens],
        [cTokenCollateral, cTokenCollateral._address, 'reserves', addReservesAmount],
        [cTokenCollateral, cTokenCollateral._address, 'tokens', -protocolShareTokens], // total supply decreases
      ]));
    });
  });
});

describe('Comptroller', () => {
  it('liquidateBorrowAllowed allows deprecated markets to be liquidated', async () => {
    let [root, liquidator, borrower] = saddle.accounts;
    let collatAmount = 10;
    let borrowAmount = 2;
    const cTokenCollat = await makeCToken({supportMarket: true, underlyingPrice: 1, collateralFactor: .5});
    const cTokenBorrow = await makeCToken({supportMarket: true, underlyingPrice: 1, comptroller: cTokenCollat.comptroller});
    const comptroller = cTokenCollat.comptroller;

    // borrow some tokens
    await send(cTokenCollat.underlying, 'harnessSetBalance', [borrower, collatAmount]);
    await send(cTokenCollat.underlying, 'approve', [cTokenCollat._address, collatAmount], {from: borrower});
    await send(cTokenBorrow.underlying, 'harnessSetBalance', [cTokenBorrow._address, collatAmount]);
    await send(cTokenBorrow, 'harnessSetTotalSupply', [collatAmount * 10]);
    await send(cTokenBorrow, 'harnessSetExchangeRate', [etherExp(1)]);
    expect(await enterMarkets([cTokenCollat], borrower)).toSucceed();
    expect(await send(cTokenCollat, 'mint', [collatAmount], {from: borrower})).toSucceed();
    expect(await send(cTokenBorrow, 'borrow', [borrowAmount], {from: borrower})).toSucceed();

    // show the account is healthy
    expect(await call(comptroller, 'isDeprecated', [cTokenBorrow._address])).toEqual(false);
    expect(await call(comptroller, 'liquidateBorrowAllowed', [cTokenBorrow._address, cTokenCollat._address, liquidator, borrower, borrowAmount])).toHaveTrollError('INSUFFICIENT_SHORTFALL');

    // show deprecating a market works
    expect(await send(comptroller, '_setCollateralFactor', [cTokenBorrow._address, 0])).toSucceed();
    expect(await send(comptroller, '_setBorrowPaused', [cTokenBorrow._address, true])).toSucceed();
    expect(await send(cTokenBorrow, '_setReserveFactor', [etherMantissa(1)])).toSucceed();

    expect(await call(comptroller, 'isDeprecated', [cTokenBorrow._address])).toEqual(true);

    // show deprecated markets can be liquidated even if healthy
    expect(await send(comptroller, 'liquidateBorrowAllowed', [cTokenBorrow._address, cTokenCollat._address, liquidator, borrower, borrowAmount])).toSucceed();

    // even if deprecated, cant over repay
    await expect(send(comptroller, 'liquidateBorrowAllowed', [cTokenBorrow._address, cTokenCollat._address, liquidator, borrower, borrowAmount * 2])).rejects.toRevert('revert Can not repay more than the total borrow');
  });
})
