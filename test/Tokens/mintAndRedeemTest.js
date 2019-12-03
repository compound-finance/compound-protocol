const {
  etherUnsigned,
  etherMantissa,
  call,
  send
} = require('../Utils/MochaTruffle');

const {
  makeCToken,
  balanceOf,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  preApprove,
  quickMint,
  preSupply,
  quickRedeem,
  quickRedeemUnderlying
} = require('../Utils/Compound');

const exchangeRate = 50e3;
const mintAmount = etherUnsigned(10e4);
const mintTokens = mintAmount.div(exchangeRate);
const redeemTokens = etherUnsigned(10e3);
const redeemAmount = redeemTokens.mul(exchangeRate);

async function preMint(cToken, minter, mintAmount, mintTokens, exchangeRate) {
  await preApprove(cToken, minter, mintAmount);
  await send(cToken.comptroller, 'setMintAllowed', [true]);
  await send(cToken.comptroller, 'setMintVerify', [true]);
  await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(cToken.underlying, 'harnessSetFailTransferFromAddress', [minter, false]);
  await send(cToken, 'harnessSetBalance', [minter, 0]);
  await send(cToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function mintFresh(cToken, minter, mintAmount) {
  return send(cToken, 'harnessMintFresh', [minter, mintAmount]);
}

async function preRedeem(cToken, redeemer, redeemTokens, redeemAmount, exchangeRate) {
  await preSupply(cToken, redeemer, redeemTokens);
  await send(cToken.comptroller, 'setRedeemAllowed', [true]);
  await send(cToken.comptroller, 'setRedeemVerify', [true]);
  await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(cToken.underlying, 'harnessSetBalance', [cToken._address, redeemAmount]);
  await send(cToken.underlying, 'harnessSetBalance', [redeemer, 0]);
  await send(cToken.underlying, 'harnessSetFailTransferToAddress', [redeemer, false]);
  await send(cToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function redeemFreshTokens(cToken, redeemer, redeemTokens, redeemAmount) {
  return send(cToken, 'harnessRedeemFresh', [redeemer, redeemTokens, 0]);
}

async function redeemFreshAmount(cToken, redeemer, redeemTokens, redeemAmount) {
  return send(cToken, 'harnessRedeemFresh', [redeemer, 0, redeemAmount]);
}

contract('CToken', function ([root, minter, redeemer, ...accounts]) {
  let cToken;
  before(async () => {
    cToken = await makeCToken({comptrollerOpts: {kind: 'bool'}, exchangeRate});
  });

  describe('mintFresh', async () => {
    beforeEach(async () => {
      await preMint(cToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("fails if comptroller tells it to", async () => {
      await send(cToken.comptroller, 'setMintAllowed', [false]);
      assert.hasTrollReject(
        await mintFresh(cToken, minter, mintAmount),
        'MINT_COMPTROLLER_REJECTION',
        'MATH_ERROR'
      );
    });

    it("proceeds if comptroller tells it to", async () => {
      await assert.success(await mintFresh(cToken, minter, mintAmount));
    });

    it("fails if not fresh", async () => {
      await fastForward(cToken);
      assert.hasTokenFailure(
        await mintFresh(cToken, minter, mintAmount),
        'MARKET_NOT_FRESH',
        'MINT_FRESHNESS_CHECK'
      );
    });

    it("continues if fresh", async () => {
      await assert.succeeds(cToken, 'accrueInterest');
      assert.success(await mintFresh(cToken, minter, mintAmount));
    });

    it("fails if insufficient approval", async () => {
      assert.success(await send(cToken.underlying, 'approve', [cToken._address, 1], {from: minter}));
      assert.hasTokenFailure(
        await mintFresh(cToken, minter, mintAmount),
        'TOKEN_INSUFFICIENT_ALLOWANCE',
        'MINT_TRANSFER_IN_NOT_POSSIBLE'
       );
    });

    it("fails if insufficient balance", async() => {
      await setBalance(cToken.underlying, minter, 1);
      assert.hasTokenFailure(
        await mintFresh(cToken, minter, mintAmount),
        'TOKEN_INSUFFICIENT_BALANCE',
        'MINT_TRANSFER_IN_NOT_POSSIBLE'
      );
    });

    it("proceeds if sufficient approval and balance", async () =>{
      assert.success(await mintFresh(cToken, minter, mintAmount));
    });

    it("fails if exchange calculation fails", async () => {
      assert.success(await send(cToken, 'harnessSetExchangeRate', [0]));
      await assert.revert(
        mintFresh(cToken, minter, mintAmount),
        'revert MINT_EXCHANGE_CALCULATION_FAILED'
      );
    });

    it("fails if transferring in fails", async () => {
      await send(cToken.underlying, 'harnessSetFailTransferFromAddress', [minter, true]);
      await assert.revert(
        mintFresh(cToken, minter, mintAmount),
        'revert TOKEN_TRANSFER_IN_FAILED'
      );
    });

    it("transfers the underlying cash, tokens, and emits Mint, Transfer events", async () => {
      const beforeBalances = await getBalances([cToken], [minter]);
      const result = await mintFresh(cToken, minter, mintAmount);
      const afterBalances = await getBalances([cToken], [minter]);
      assert.success(result);
      assert.hasLog(result, 'Mint', {
        minter,
        mintAmount: mintAmount.toString(),
        mintTokens: mintTokens.toString()
      });
      assert.hasLog(result, ['Transfer', 1], {
        from: cToken._address,
        to: minter,
        amount: mintTokens.toString()
      });
      assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
        [cToken, minter, 'cash', -mintAmount],
        [cToken, minter, 'tokens', mintTokens],
        [cToken, 'cash', mintAmount],
        [cToken, 'tokens', mintTokens]
      ]));
    });
  });

  describe('mint', async () => {
    beforeEach(async () => {
      await preMint(cToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("emits a mint failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(quickMint(cToken, minter, mintAmount), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from mintFresh without emitting any extra logs", async () => {
      await send(cToken.underlying, 'harnessSetBalance', [minter, 1]);
      assert.hasTokenFailure(
        await quickMint(cToken, minter, mintAmount, {faucet: false}),
        'TOKEN_INSUFFICIENT_BALANCE',
        'MINT_TRANSFER_IN_NOT_POSSIBLE'
      );
    });

    it("returns success from mintFresh and mints the correct number of tokens", async () => {
      assert.success(await quickMint(cToken, minter, mintAmount));
      assert.numNotEqual(mintTokens, 0);
      assert.numEqual(await balanceOf(cToken, minter), mintTokens);
    });

    it("emits an AccrueInterest event", async () => {
      assert.hasLog(await quickMint(cToken, minter, mintAmount), 'AccrueInterest', {});
    });
  });

  [redeemFreshTokens, redeemFreshAmount].forEach((redeemFresh) => {
    describe(redeemFresh.name, async () => {
      beforeEach(async () => {
        await preRedeem(cToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      });

      it("fails if comptroller tells it to", async () =>{
        await send(cToken.comptroller, 'setRedeemAllowed', [false]);
        assert.hasTrollReject(
          await redeemFresh(cToken, redeemer, redeemTokens, redeemAmount),
          'REDEEM_COMPTROLLER_REJECTION'
        );
      });

      it("fails if not fresh", async () => {
        await fastForward(cToken);
        assert.hasTokenFailure(
          await redeemFresh(cToken, redeemer, redeemTokens, redeemAmount),
          'MARKET_NOT_FRESH',
          'REDEEM_FRESHNESS_CHECK'
        );
      });

      it("continues if fresh", async () => {
        await assert.succeeds(cToken, 'accrueInterest');
        assert.success(await redeemFresh(cToken, redeemer, redeemTokens, redeemAmount));
      });

      it("fails if insufficient protocol cash to transfer out", async() => {
        await send(cToken.underlying, 'harnessSetBalance', [cToken._address, 1]);
        assert.hasTokenFailure(
          await redeemFresh(cToken, redeemer, redeemTokens, redeemAmount),
          'TOKEN_INSUFFICIENT_CASH',
          'REDEEM_TRANSFER_OUT_NOT_POSSIBLE'
        );
      });

      it("fails if exchange calculation fails", async () => {
        if (redeemFresh == redeemFreshTokens) {
          assert.success(await send(cToken, 'harnessSetExchangeRate', [-1]));
          assert.hasTokenFailure(
            await redeemFresh(cToken, redeemer, redeemTokens, redeemAmount),
            'MATH_ERROR',
            'REDEEM_EXCHANGE_TOKENS_CALCULATION_FAILED'
          );
        } else {
          assert.success(await send(cToken, 'harnessSetExchangeRate', [0]));
          assert.hasTokenFailure(
            await redeemFresh(cToken, redeemer, redeemTokens, redeemAmount),
            'MATH_ERROR',
            'REDEEM_EXCHANGE_AMOUNT_CALCULATION_FAILED'
          );
        }
      });

      it("fails if transferring out fails", async () => {
        await send(cToken.underlying, 'harnessSetFailTransferToAddress', [redeemer, true]);
        await assert.revert(redeemFresh(cToken, redeemer, redeemTokens, redeemAmount), "revert TOKEN_TRANSFER_OUT_FAILED");
      });

      it("fails if total supply < redemption amount", async () => {
        await send(cToken, 'harnessExchangeRateDetails', [0, 0, 0]);
        assert.hasTokenFailure(
          await redeemFresh(cToken, redeemer, redeemTokens, redeemAmount),
          'MATH_ERROR',
          'REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED'
        );
      });

      it("reverts if new account balance underflows", async () => {
        await send(cToken, 'harnessSetBalance', [redeemer, 0]);
        assert.hasTokenFailure(
          await redeemFresh(cToken, redeemer, redeemTokens, redeemAmount),
          'MATH_ERROR',
          'REDEEM_NEW_ACCOUNT_BALANCE_CALCULATION_FAILED'
        );
      });

      it("transfers the underlying cash, tokens, and emits Redeem, Transfer events", async () => {
        const beforeBalances = await getBalances([cToken], [redeemer]);
        const result = await redeemFresh(cToken, redeemer, redeemTokens, redeemAmount);
        const afterBalances = await getBalances([cToken], [redeemer]);
        assert.success(result);
        assert.hasLog(result, 'Redeem', {
          redeemer,
          redeemAmount: redeemAmount.toString(),
          redeemTokens: redeemTokens.toString()
        });
        assert.hasLog(result, ['Transfer', 1], {
          from: redeemer,
          to: cToken._address,
          amount: redeemTokens.toString()
        });
        assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
          [cToken, redeemer, 'cash', redeemAmount],
          [cToken, redeemer, 'tokens', -redeemTokens],
          [cToken, 'cash', -redeemAmount],
          [cToken, 'tokens', -redeemTokens]
        ]));
      });
    });
  });

  describe('redeem', async () => {
    beforeEach(async () => {
      await preRedeem(cToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
    });

    it("emits a redeem failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(quickRedeem(cToken, redeemer, redeemTokens), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from redeemFresh without emitting any extra logs", async () => {
      await setBalance(cToken.underlying, cToken._address, 0);
      assert.hasTokenFailure(
        await quickRedeem(cToken, redeemer, redeemTokens, {exchangeRate}),
        'TOKEN_INSUFFICIENT_CASH',
        'REDEEM_TRANSFER_OUT_NOT_POSSIBLE'
      );
    });

    it("returns success from redeemFresh and redeems the right amount", async () => {
      assert.success(await send(cToken.underlying, 'harnessSetBalance', [cToken._address, redeemAmount]));
      assert.success(await quickRedeem(cToken, redeemer, redeemTokens, {exchangeRate}));
      assert.numNotEqual(redeemAmount, 0);
      assert.numEqual(await balanceOf(cToken.underlying, redeemer), redeemAmount);
    });

    it("returns success from redeemFresh and redeems the right amount of underlying", async () => {
      assert.success(await send(cToken.underlying, 'harnessSetBalance', [cToken._address, redeemAmount]));
      assert.success(await quickRedeemUnderlying(cToken, redeemer, redeemAmount, {exchangeRate}));
      assert.numNotEqual(redeemAmount, 0);
      assert.numEqual(await balanceOf(cToken.underlying, redeemer), redeemAmount);
    });

    it("emits an AccrueInterest event", async () => {
      assert.hasLog(await quickMint(cToken, minter, mintAmount), 'AccrueInterest', {});
    });
  });
});
