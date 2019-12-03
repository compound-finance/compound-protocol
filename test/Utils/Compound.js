"use strict";

const { dfn } = require('./JS');
const {
  etherBalance,
  etherMantissa,
  etherUnsigned,

  getContract,
  getTestContract,
  guessRoot,

  send,
  call,
  callUnsigned
} = require('./MochaTruffle');

async function makeComptroller(opts = {}) {
  const {
    root = await guessRoot(),
    kind = 'unitroller-v1'
  } = opts || {};

  if (kind == 'bool') {
    const Comptroller = getTestContract('BoolComptroller');
    const comptroller = await Comptroller.deploy().send({ from: root });
    return comptroller;
  }

  if (kind == 'false-marker') {
    const Comptroller = getTestContract('FalseMarkerMethodComptroller');
    const comptroller = await Comptroller.deploy().send({ from: root });
    return comptroller;
  }

  if (kind == 'v1-no-proxy') {
    const Comptroller = getContract('ComptrollerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const maxAssets = etherUnsigned(dfn(opts.maxAssets, 10));
    const comptroller = await Comptroller.deploy().send({ from: root });

    await comptroller.methods._setCloseFactor(closeFactor).send({ from: root });
    await comptroller.methods._setMaxAssets(maxAssets).send({ from: root });
    await comptroller.methods._setPriceOracle(priceOracle._address).send({ from: root });

    comptroller.options.address = comptroller._address;
    return Object.assign(comptroller, { priceOracle });
  }

  if (kind == 'unitroller-v1') {
    const Unitroller = getContract('Unitroller');
    const Comptroller = getContract('ComptrollerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const maxAssets = etherUnsigned(dfn(opts.maxAssets, 10));
    const liquidationIncentive = etherMantissa(1);
    const unitroller = await Unitroller.deploy().send({ from: root });
    const comptroller = await Comptroller.deploy().send({ from: root });
    await unitroller.methods._setPendingImplementation(comptroller._address).send({ from: root });
    await comptroller.methods._become(unitroller._address).send({ from: root });
    comptroller.options.address = unitroller._address;
    await comptroller.methods._setLiquidationIncentive(liquidationIncentive).send({ from: root });
    await comptroller.methods._setCloseFactor(closeFactor).send({ from: root });
    await comptroller.methods._setMaxAssets(maxAssets).send({ from: root });
    await comptroller.methods._setPriceOracle(priceOracle._address).send({ from: root });
    return Object.assign(comptroller, { priceOracle });
  }
}

async function makeCToken(opts = {}) {
  const {
    root = await guessRoot(),
    kind = 'cerc20'
  } = opts || {};

  const comptroller = opts.comptroller || await makeComptroller(opts.comptrollerOpts);
  const interestRateModel = opts.interestRateModel || await makeInterestRateModel(opts.interestRateModelOpts);
  const exchangeRate = etherMantissa(dfn(opts.exchangeRate, 1));
  const decimals = etherUnsigned(dfn(opts.decimals, 8));
  const symbol = opts.symbol || 'cOMG';
  const name = opts.name || `CToken ${symbol}`;
  const admin = opts.admin || root;

  let cToken, underlying;

  switch (kind) {
    case 'cether':
      const CEther = getTestContract('CEtherHarness');
      cToken = await CEther.deploy({
        arguments: [
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin
        ]
      }).send({ from: root });
      break;
    case 'cerc20':
    default:
      const delegatee = getContract('CErc20DelegateHarness');
      const delegator = getContract('CErc20Delegator');
      underlying = opts.underlying || await makeToken(opts.underlyingOpts);
      let cDelegatee = await delegatee.deploy().send({ from: admin });

      let cDelegator = await delegator.deploy({
        arguments: [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          cDelegatee._address,
          "0x0"
        ]
      }).send({ from: admin });
      cToken = await delegatee.at(cDelegator._address);
      break;
  }

  if (opts.supportMarket) {
    await comptroller.methods._supportMarket(cToken._address).send({ from: root });
  }

  if (opts.underlyingPrice) {
    const price = etherMantissa(opts.underlyingPrice);
    await comptroller.priceOracle.methods.setUnderlyingPrice(cToken._address, price).send({ from: root });
  }

  if (opts.collateralFactor) {
    const factor = etherMantissa(opts.collateralFactor);
    await comptroller.methods._setCollateralFactor(cToken._address, factor).send({ from: root });
  }

  return Object.assign(cToken, { name, symbol, underlying, comptroller, interestRateModel });
}

async function makeInterestRateModel(opts = {}) {
  const {
    root = await guessRoot(),
    kind = 'harnessed'
  } = opts || {};

  if (kind == 'harnessed') {
    const InterestRateModel = getTestContract('InterestRateModelHarness');
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    const interestRateModel = await InterestRateModel.deploy({ arguments: [borrowRate] }).send({ from: root });
    return interestRateModel;
  }

  if (kind == 'false-marker') {
    const InterestRateModel = getTestContract('FalseMarkerMethodInterestRateModel');
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    const interestRateModel = await InterestRateModel.deploy({ arguments: [borrowRate] }).send({ from: root });
    return interestRateModel;
  }

  if (kind == 'white-paper') {
    const InterestRateModel = getTestContract('WhitePaperInterestRateModel');
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 1e-18));
    const interestRateModel = await InterestRateModel.deploy({ arguments: [baseRate, multiplier] }).send({ from: root });
    return interestRateModel;
  }

  if (kind == 'jump-rate') {
    const InterestRateModel = getTestContract('JumpRateModel');
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 1e-18));
    const kink = etherMantissa(dfn(opts.kink, 0.95e18));
    const jump = etherUnsigned(dfn(opts.jump, 5));
    const interestRateModel = await InterestRateModel.deploy({ arguments: [baseRate, multiplier, kink, jump] }).send({ from: root });
    return interestRateModel;
  }
}

async function makePriceOracle(opts = {}) {
  const {
    root = await guessRoot(),
    kind = 'simple'
  } = opts || {};

  if (kind == 'simple') {
    const PriceOracle = getContract('SimplePriceOracle');
    const priceOracle = await PriceOracle.deploy().send({ from: root });
    return priceOracle;
  }
}

async function makeToken(opts = {}) {
  const {
    root = await guessRoot(),
    kind = 'erc20'
  } = opts || {};

  if (kind == 'erc20') {
    const Token = getTestContract('EIP20Harness');
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || 'OMG';
    const name = opts.name || `Erc20 ${symbol}`;
    const token = await Token.deploy({ arguments: [quantity, name, decimals, symbol] }).send({ from: root });
    return token;
  }
}

async function balanceOf(token, account) {
  return callUnsigned(token, 'balanceOf', [account]);
}

async function totalSupply(token) {
  return callUnsigned(token, 'totalSupply');
}

async function borrowSnapshot(cToken, account) {
  const { principal, interestIndex } = await call(cToken, 'harnessAccountBorrows', [account]);
  return { principal: etherUnsigned(principal), interestIndex: etherUnsigned(interestIndex) };
}

async function totalBorrows(cToken) {
  return callUnsigned(cToken, 'totalBorrows');
}

async function totalReserves(cToken) {
  return callUnsigned(cToken, 'totalReserves');
}

async function enterMarkets(cTokens, from) {
  return send(cTokens[0].comptroller, 'enterMarkets', [cTokens.map(c => c._address)], { from });
}

async function fastForward(cToken, blocks = 5) {
  return send(cToken, 'harnessFastForward', [blocks]);
}

async function setBalance(cToken, account, balance) {
  return send(cToken, 'harnessSetBalance', [account, balance]);
}

async function setEtherBalance(cEther, balance) {
  const current = await etherBalance(cEther._address);
  const root = await guessRoot();
  await send(cEther, 'harnessDoTransferOut', [root, current]);
  await send(cEther, 'harnessDoTransferIn', [root, balance], { value: balance });
}

async function getBalances(cTokens, accounts) {
  const balances = {};
  for (let cToken of cTokens) {
    const cBalances = balances[cToken._address] = {};
    for (let account of accounts) {
      cBalances[account] = {
        eth: await etherBalance(account),
        cash: cToken.underlying && await balanceOf(cToken.underlying, account),
        tokens: await balanceOf(cToken, account),
        borrows: (await borrowSnapshot(cToken, account)).principal
      };
    }
    cBalances[cToken._address] = {
      eth: await etherBalance(cToken._address),
      cash: cToken.underlying && await balanceOf(cToken.underlying, cToken._address),
      tokens: await totalSupply(cToken),
      borrows: await totalBorrows(cToken),
      reserves: await totalReserves(cToken)
    };
  }
  return balances;
}

async function adjustBalances(balances, deltas) {
  for (let delta of deltas) {
    let cToken, account, key, diff;
    if (delta.length == 4) {
      ([cToken, account, key, diff] = delta);
    } else {
      ([cToken, key, diff] = delta);
      account = cToken._address;
    }
    balances[cToken._address][account][key] = balances[cToken._address][account][key].add(diff);
  }
  return balances;
}


async function preApprove(cToken, from, amount, opts = {}) {
  if (dfn(opts.faucet, true)) {
    assert.success(await send(cToken.underlying, 'harnessSetBalance', [from, amount], { from }));
  }
  return send(cToken.underlying, 'approve', [cToken._address, amount], { from });
}

async function quickMint(cToken, minter, mintAmount, opts = {}) {
  if (dfn(opts.approve, true)) {
    assert.success(await preApprove(cToken, minter, mintAmount, opts));
  }
  if (dfn(opts.exchangeRate)) {
    assert.success(await send(cToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)]));
  }
  return send(cToken, 'mint', [mintAmount], { from: minter });
}


async function preSupply(cToken, account, tokens, opts = {}) {
  if (dfn(opts.total, true)) {
    assert.success(await send(cToken, 'harnessSetTotalSupply', [tokens]));
  }
  return send(cToken, 'harnessSetBalance', [account, tokens]);
}

async function quickRedeem(cToken, redeemer, redeemTokens, opts = {}) {
  if (dfn(opts.supply, true)) {
    assert.success(await preSupply(cToken, redeemer, redeemTokens, opts));
  }
  if (dfn(opts.exchangeRate)) {
    assert.success(await send(cToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)]));
  }
  return send(cToken, 'redeem', [redeemTokens], { from: redeemer });
}

async function quickRedeemUnderlying(cToken, redeemer, redeemAmount, opts = {}) {
  if (dfn(opts.exchangeRate)) {
    assert.success(await send(cToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)]));
  }
  return send(cToken, 'redeemUnderlying', [redeemAmount], { from: redeemer });
}

async function setOraclePrice(cToken, price) {
  return send(cToken.comptroller.priceOracle, 'setUnderlyingPrice', [cToken._address, etherMantissa(price)]);
}

async function setBorrowRate(cToken, rate) {
  return send(cToken.interestRateModel, 'setBorrowRate', [etherMantissa(rate)]);
}

async function getBorrowRate(interestRateModel, cash, borrows, reserves) {
  return call(interestRateModel, 'getBorrowRate', [cash, borrows, reserves].map(etherUnsigned));
}

async function getSupplyRate(interestRateModel, cash, borrows, reserves, reserveFactor) {
  return call(interestRateModel, 'getSupplyRate', [cash, borrows, reserves, reserveFactor].map(etherUnsigned));
}

async function pretendBorrow(cToken, borrower, accountIndex, marketIndex, principalRaw, blockNumber = 2e7) {
  await send(cToken, 'harnessSetTotalBorrows', [etherUnsigned(principalRaw)]);
  await send(cToken, 'harnessSetAccountBorrows', [borrower, etherUnsigned(principalRaw), etherMantissa(accountIndex)]);
  await send(cToken, 'harnessSetBorrowIndex', [etherMantissa(marketIndex)]);
  await send(cToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(blockNumber)]);
  await send(cToken, 'harnessSetBlockNumber', [etherUnsigned(blockNumber)]);
}

module.exports = {
  makeComptroller,
  makeCToken,
  makeInterestRateModel,
  makePriceOracle,
  makeToken,

  balanceOf,
  totalSupply,
  borrowSnapshot,
  totalBorrows,
  totalReserves,
  enterMarkets,
  fastForward,
  setBalance,
  setEtherBalance,
  getBalances,
  adjustBalances,

  preApprove,
  quickMint,

  preSupply,
  quickRedeem,
  quickRedeemUnderlying,

  setOraclePrice,
  setBorrowRate,
  getBorrowRate,
  getSupplyRate,
  pretendBorrow
};
