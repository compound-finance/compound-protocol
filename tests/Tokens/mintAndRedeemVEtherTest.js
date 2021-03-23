const {
  etherGasCost,
  etherMantissa,
  etherUnsigned,
  sendFallback
} = require('../Utils/Ethereum');

const {
  makeVToken,
  balanceOf,
  fastForward,
  setBalance,
  setEtherBalance,
  getBalances,
  adjustBalances,
} = require('../Utils/Vortex');

const exchangeRate = 5;
const mintAmount = etherUnsigned(1e5);
const mintTokens = mintAmount.dividedBy(exchangeRate);
const redeemTokens = etherUnsigned(10e3);
const redeemAmount = redeemTokens.multipliedBy(exchangeRate);

async function preMint(vToken, minter, mintAmount, mintTokens, exchangeRate) {
  await send(vToken.controller, 'setMintAllowed', [true]);
  await send(vToken.controller, 'setMintVerify', [true]);
  await send(vToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(vToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function mintExplicit(vToken, minter, mintAmount) {
  return send(vToken, 'mint', [], {from: minter, value: mintAmount});
}

async function mintFallback(vToken, minter, mintAmount) {
  return sendFallback(vToken, {from: minter, value: mintAmount});
}

async function preRedeem(vToken, redeemer, redeemTokens, redeemAmount, exchangeRate) {
  await send(vToken.controller, 'setRedeemAllowed', [true]);
  await send(vToken.controller, 'setRedeemVerify', [true]);
  await send(vToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(vToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
  await setEtherBalance(vToken, redeemAmount);
  await send(vToken, 'harnessSetTotalSupply', [redeemTokens]);
  await setBalance(vToken, redeemer, redeemTokens);
}

async function redeemVTokens(vToken, redeemer, redeemTokens, redeemAmount) {
  return send(vToken, 'redeem', [redeemTokens], {from: redeemer});
}

async function redeemUnderlying(vToken, redeemer, redeemTokens, redeemAmount) {
  return send(vToken, 'redeemUnderlying', [redeemAmount], {from: redeemer});
}

describe('VEther', () => {
  let root, minter, redeemer, accounts;
  let vToken;

  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    vToken = await makeVToken({kind: 'vether', controllerOpts: {kind: 'bool'}});
    await fastForward(vToken, 1);
  });

  [mintExplicit, mintFallback].forEach((mint) => {
    describe(mint.name, () => {
      beforeEach(async () => {
        await preMint(vToken, minter, mintAmount, mintTokens, exchangeRate);
      });

      it("reverts if interest accrual fails", async () => {
        await send(vToken.interestRateModel, 'setFailBorrowRate', [true]);
        await expect(mint(vToken, minter, mintAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns success from mintFresh and mints the correct number of tokens", async () => {
        const beforeBalances = await getBalances([vToken], [minter]);
        const receipt = await mint(vToken, minter, mintAmount);
        const afterBalances = await getBalances([vToken], [minter]);
        expect(receipt).toSucceed();
        expect(mintTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [vToken, 'eth', mintAmount],
          [vToken, 'tokens', mintTokens],
          [vToken, minter, 'eth', -mintAmount.plus(await etherGasCost(receipt))],
          [vToken, minter, 'tokens', mintTokens]
        ]));
      });
    });
  });

  [redeemVTokens, redeemUnderlying].forEach((redeem) => {
    describe(redeem.name, () => {
      beforeEach(async () => {
        await preRedeem(vToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      });

      it("emits a redeem failure if interest accrual fails", async () => {
        await send(vToken.interestRateModel, 'setFailBorrowRate', [true]);
        await expect(redeem(vToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns error from redeemFresh without emitting any extra logs", async () => {
        expect(await redeem(vToken, redeemer, redeemTokens.multipliedBy(5), redeemAmount.multipliedBy(5))).toHaveTokenFailure('MATH_ERROR', 'REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED');
      });

      it("returns success from redeemFresh and redeems the correct amount", async () => {
        await fastForward(vToken);
        const beforeBalances = await getBalances([vToken], [redeemer]);
        const receipt = await redeem(vToken, redeemer, redeemTokens, redeemAmount);
        expect(receipt).toTokenSucceed();
        const afterBalances = await getBalances([vToken], [redeemer]);
        expect(redeemTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [vToken, 'eth', -redeemAmount],
          [vToken, 'tokens', -redeemTokens],
          [vToken, redeemer, 'eth', redeemAmount.minus(await etherGasCost(receipt))],
          [vToken, redeemer, 'tokens', -redeemTokens]
        ]));
      });
    });
  });
});
