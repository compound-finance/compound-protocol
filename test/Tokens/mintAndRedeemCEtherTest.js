const {
  etherGasCost,
  etherMantissa,
  etherUnsigned,
  send,
  sendFallback
} = require('../Utils/MochaTruffle');

const {
  makeCToken,
  balanceOf,
  fastForward,
  setBalance,
  setEtherBalance,
  getBalances,
  adjustBalances,
} = require('../Utils/Compound');

const exchangeRate = 5;
const mintAmount = etherUnsigned(1e5);
const mintTokens = mintAmount.div(exchangeRate);
const redeemTokens = etherUnsigned(10e3);
const redeemAmount = redeemTokens.mul(exchangeRate);

async function preMint(cToken, minter, mintAmount, mintTokens, exchangeRate) {
  await send(cToken.comptroller, 'setMintAllowed', [true]);
  await send(cToken.comptroller, 'setMintVerify', [true]);
  await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(cToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function mintExplicit(cToken, minter, mintAmount) {
  return send(cToken, 'mint', [], {from: minter, value: mintAmount});
}

async function mintFallback(cToken, minter, mintAmount) {
  return sendFallback(cToken, {from: minter, value: mintAmount});
}

async function preRedeem(cToken, redeemer, redeemTokens, redeemAmount, exchangeRate) {
  await send(cToken.comptroller, 'setRedeemAllowed', [true]);
  await send(cToken.comptroller, 'setRedeemVerify', [true]);
  await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(cToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
  await setEtherBalance(cToken, redeemAmount);
  await setBalance(cToken, redeemer, redeemTokens);
}

async function redeemCTokens(cToken, redeemer, redeemTokens, redeemAmount) {
  return send(cToken, 'redeem', [redeemTokens], {from: redeemer});
}

async function redeemUnderlying(cToken, redeemer, redeemTokens, redeemAmount) {
  return send(cToken, 'redeemUnderlying', [redeemAmount], {from: redeemer});
}

contract('CEther', function ([root, minter, redeemer, ...accounts]) {
  let cToken;
  before(async () => {
    cToken = await makeCToken({kind: 'cether', comptrollerOpts: {kind: 'bool'}});
  });

  [mintExplicit, mintFallback].forEach((mint) => {
    describe(mint.name, async () => {
      beforeEach(async () => {
        await preMint(cToken, minter, mintAmount, mintTokens, exchangeRate);
      });

      it("reverts if interest accrual fails", async () => {
        await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
        await assert.revert(mint(cToken, minter, mintAmount), "revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns success from mintFresh and mints the correct number of tokens", async () => {
        const beforeBalances = await getBalances([cToken], [minter]);
        const receipt = await mint(cToken, minter, mintAmount);
        const afterBalances = await getBalances([cToken], [minter]);
        assert.success(receipt);
        assert.numNotEqual(mintTokens, 0);
        assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
          [cToken, 'eth', mintAmount],
          [cToken, 'tokens', mintTokens],
          [cToken, minter, 'eth', -mintAmount.add(await etherGasCost(receipt))],
          [cToken, minter, 'tokens', mintTokens]
        ]));
      });
    });
  });

  [redeemCTokens, redeemUnderlying].forEach((redeem) => {
    describe(redeem.name, async () => {
      beforeEach(async () => {
        await preRedeem(cToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      });

      it("emits a redeem failure if interest accrual fails", async () => {
        await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
        await assert.revert(redeem(cToken, redeemer, redeemTokens, redeemAmount), "revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns error from redeemFresh without emitting any extra logs", async () => {
        assert.hasTokenFailure(
          await redeem(cToken, redeemer, redeemTokens.mul(5), redeemAmount.mul(5)),
          'MATH_ERROR',
          'REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED'
        );
      });

      it("returns success from redeemFresh and redeems the correct amount", async () => {
        await fastForward(cToken);
        const beforeBalances = await getBalances([cToken], [redeemer]);
        const receipt = await redeem(cToken, redeemer, redeemTokens, redeemAmount);
        const afterBalances = await getBalances([cToken], [redeemer]);
        assert.success(receipt);
        assert.numNotEqual(redeemTokens, 0);
        assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
          [cToken, 'eth', -redeemAmount],
          [cToken, 'tokens', -redeemTokens],
          [cToken, redeemer, 'eth', redeemAmount.sub(await etherGasCost(receipt))],
          [cToken, redeemer, 'tokens', -redeemTokens]
        ]));
      });
    });
  });
});
