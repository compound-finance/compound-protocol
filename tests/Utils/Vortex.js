"use strict";

const { dfn } = require('./JS');
const {
  encodeParameters,
  etherBalance,
  etherMantissa,
  etherUnsigned,
  mergeInterface
} = require('./Ethereum');
const BigNumber = require('bignumber.js');

async function makeController(opts = {}) {
  const {
    root = saddle.account,
    kind = 'unitroller'
  } = opts || {};

  if (kind == 'bool') {
    return await deploy('BoolController');
  }

  if (kind == 'false-marker') {
    return await deploy('FalseMarkerMethodController');
  }

  if (kind == 'v1-no-proxy') {
    const controller = await deploy('ControllerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));

    await send(controller, '_setCloseFactor', [closeFactor]);
    await send(controller, '_setPriceOracle', [priceOracle._address]);

    return Object.assign(controller, { priceOracle });
  }

  if (kind == 'unitroller-g2') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const controller = await deploy('ControllerScenarioG2');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const maxAssets = etherUnsigned(dfn(opts.maxAssets, 10));
    const liquidationIncentive = etherMantissa(1);

    await send(unitroller, '_setPendingImplementation', [controller._address]);
    await send(controller, '_become', [unitroller._address]);
    mergeInterface(unitroller, controller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setMaxAssets', [maxAssets]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);

    return Object.assign(unitroller, { priceOracle });
  }

  if (kind == 'unitroller-g3') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const controller = await deploy('ControllerScenarioG3');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const maxAssets = etherUnsigned(dfn(opts.maxAssets, 10));
    const liquidationIncentive = etherMantissa(1);
    const vtxRate = etherUnsigned(dfn(opts.vtxRate, 1e18));
    const vtxMarkets = opts.vtxMarkets || [];
    const otherMarkets = opts.otherMarkets || [];

    await send(unitroller, '_setPendingImplementation', [controller._address]);
    await send(controller, '_become', [unitroller._address, vtxRate, vtxMarkets, otherMarkets]);
    mergeInterface(unitroller, controller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setMaxAssets', [maxAssets]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);

    return Object.assign(unitroller, { priceOracle });
  }

  if (kind == 'unitroller-g6') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const controller = await deploy('ControllerScenarioG6');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const liquidationIncentive = etherMantissa(1);
    const vtx = opts.vtx || await deploy('Vtx', [opts.vtxOwner || root]);
    const vtxRate = etherUnsigned(dfn(opts.vtxRate, 1e18));

    await send(unitroller, '_setPendingImplementation', [controller._address]);
    await send(controller, '_become', [unitroller._address]);
    mergeInterface(unitroller, controller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);
    await send(unitroller, '_setVtxRate', [vtxRate]);
    await send(unitroller, 'setVtxAddress', [vtx._address]); // harness only

    return Object.assign(unitroller, { priceOracle, vtx });
  }

  if (kind == 'unitroller') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const controller = await deploy('ControllerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const liquidationIncentive = etherMantissa(1);
    const vtx = opts.vtx || await deploy('Vtx', [opts.vtxOwner || root]);
    const vtxRate = etherUnsigned(dfn(opts.vtxRate, 1e18));

    await send(unitroller, '_setPendingImplementation', [controller._address]);
    await send(controller, '_become', [unitroller._address]);
    mergeInterface(unitroller, controller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);
    await send(unitroller, 'setVtxAddress', [vtx._address]); // harness only
    await send(unitroller, 'harnessSetVtxRate', [vtxRate]);

    return Object.assign(unitroller, { priceOracle, vtx });
  }
}

async function makeVToken(opts = {}) {
  const {
    root = saddle.account,
    kind = 'verc20'
  } = opts || {};

  const controller = opts.controller || await makeController(opts.controllerOpts);
  const interestRateModel = opts.interestRateModel || await makeInterestRateModel(opts.interestRateModelOpts);
  const exchangeRate = etherMantissa(dfn(opts.exchangeRate, 1));
  const decimals = etherUnsigned(dfn(opts.decimals, 8));
  const symbol = opts.symbol || (kind === 'vether' ? 'vETH' : 'cOMG');
  const name = opts.name || `VToken ${symbol}`;
  const admin = opts.admin || root;

  let vToken, underlying;
  let cDelegator, cDelegatee, vDaiMaker;

  switch (kind) {
    case 'vether':
      vToken = await deploy('VEtherHarness',
        [
          controller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin
        ])
      break;

    case 'vdai':
      vDaiMaker  = await deploy('VDaiDelegateMakerHarness');
      underlying = vDaiMaker;
      cDelegatee = await deploy('VDaiDelegateHarness');
      cDelegator = await deploy('VErc20Delegator',
        [
          underlying._address,
          controller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          cDelegatee._address,
          encodeParameters(['address', 'address'], [vDaiMaker._address, vDaiMaker._address])
        ]
      );
      vToken = await saddle.getContractAt('VDaiDelegateHarness', cDelegator._address);
      break;

    case 'vvtx':
      underlying = await deploy('Vtx', [opts.vtxHolder || root]);
      cDelegatee = await deploy('VVtxLikeDelegate');
      cDelegator = await deploy('VErc20Delegator',
        [
          underlying._address,
          controller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          cDelegatee._address,
          "0x0"
        ]
      );
      vToken = await saddle.getContractAt('VVtxLikeDelegate', cDelegator._address);
      break;

    case 'verc20':
    default:
      underlying = opts.underlying || await makeToken(opts.underlyingOpts);
      cDelegatee = await deploy('VErc20DelegateHarness');
      cDelegator = await deploy('VErc20Delegator',
        [
          underlying._address,
          controller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          cDelegatee._address,
          "0x0"
        ]
      );
      vToken = await saddle.getContractAt('VErc20DelegateHarness', cDelegator._address);
      break;
  }

  if (opts.supportMarket) {
    await send(controller, '_supportMarket', [vToken._address]);
  }

  if (opts.addVtxMarket) {
    await send(controller, '_addVtxMarket', [vToken._address]);
  }

  if (opts.underlyingPrice) {
    const price = etherMantissa(opts.underlyingPrice);
    await send(controller.priceOracle, 'setUnderlyingPrice', [vToken._address, price]);
  }

  if (opts.collateralFactor) {
    const factor = etherMantissa(opts.collateralFactor);
    expect(await send(controller, '_setCollateralFactor', [vToken._address, factor])).toSucceed();
  }

  return Object.assign(vToken, { name, symbol, underlying, controller, interestRateModel });
}

async function makeInterestRateModel(opts = {}) {
  const {
    root = saddle.account,
    kind = 'harnessed'
  } = opts || {};

  if (kind == 'harnessed') {
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    return await deploy('InterestRateModelHarness', [borrowRate]);
  }

  if (kind == 'false-marker') {
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    return await deploy('FalseMarkerMethodInterestRateModel', [borrowRate]);
  }

  if (kind == 'white-paper') {
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 1e-18));
    return await deploy('WhitePaperInterestRateModel', [baseRate, multiplier]);
  }

  if (kind == 'jump-rate') {
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 1e-18));
    const jump = etherMantissa(dfn(opts.jump, 0));
    const kink = etherMantissa(dfn(opts.kink, 0));
    return await deploy('JumpRateModel', [baseRate, multiplier, jump, kink]);
  }
}

async function makePriceOracle(opts = {}) {
  const {
    root = saddle.account,
    kind = 'simple'
  } = opts || {};

  if (kind == 'simple') {
    return await deploy('SimplePriceOracle');
  }
}

async function makeToken(opts = {}) {
  const {
    root = saddle.account,
    kind = 'erc20'
  } = opts || {};

  if (kind == 'erc20') {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || 'OMG';
    const name = opts.name || `Erc20 ${symbol}`;
    return await deploy('ERC20Harness', [quantity, name, decimals, symbol]);
  }
}

async function balanceOf(token, account) {
  return etherUnsigned(await call(token, 'balanceOf', [account]));
}

async function totalSupply(token) {
  return etherUnsigned(await call(token, 'totalSupply'));
}

async function borrowSnapshot(vToken, account) {
  const { principal, interestIndex } = await call(vToken, 'harnessAccountBorrows', [account]);
  return { principal: etherUnsigned(principal), interestIndex: etherUnsigned(interestIndex) };
}

async function totalBorrows(vToken) {
  return etherUnsigned(await call(vToken, 'totalBorrows'));
}

async function totalReserves(vToken) {
  return etherUnsigned(await call(vToken, 'totalReserves'));
}

async function enterMarkets(vTokens, from) {
  return await send(vTokens[0].controller, 'enterMarkets', [vTokens.map(c => c._address)], { from });
}

async function fastForward(vToken, blocks = 5) {
  return await send(vToken, 'harnessFastForward', [blocks]);
}

async function setBalance(vToken, account, balance) {
  return await send(vToken, 'harnessSetBalance', [account, balance]);
}

async function setEtherBalance(vEther, balance) {
  const current = await etherBalance(vEther._address);
  const root = saddle.account;
  expect(await send(vEther, 'harnessDoTransferOut', [root, current])).toSucceed();
  expect(await send(vEther, 'harnessDoTransferIn', [root, balance], { value: balance })).toSucceed();
}

async function getBalances(vTokens, accounts) {
  const balances = {};
  for (let vToken of vTokens) {
    const cBalances = balances[vToken._address] = {};
    for (let account of accounts) {
      cBalances[account] = {
        eth: await etherBalance(account),
        cash: vToken.underlying && await balanceOf(vToken.underlying, account),
        tokens: await balanceOf(vToken, account),
        borrows: (await borrowSnapshot(vToken, account)).principal
      };
    }
    cBalances[vToken._address] = {
      eth: await etherBalance(vToken._address),
      cash: vToken.underlying && await balanceOf(vToken.underlying, vToken._address),
      tokens: await totalSupply(vToken),
      borrows: await totalBorrows(vToken),
      reserves: await totalReserves(vToken)
    };
  }
  return balances;
}

async function adjustBalances(balances, deltas) {
  for (let delta of deltas) {
    let vToken, account, key, diff;
    if (delta.length == 4) {
      ([vToken, account, key, diff] = delta);
    } else {
      ([vToken, key, diff] = delta);
      account = vToken._address;
    }

    balances[vToken._address][account][key] = new BigNumber(balances[vToken._address][account][key]).plus(diff);
  }
  return balances;
}


async function preApprove(vToken, from, amount, opts = {}) {
  if (dfn(opts.faucet, true)) {
    expect(await send(vToken.underlying, 'harnessSetBalance', [from, amount], { from })).toSucceed();
  }

  return send(vToken.underlying, 'approve', [vToken._address, amount], { from });
}

async function quickMint(vToken, minter, mintAmount, opts = {}) {
  // make sure to accrue interest
  await fastForward(vToken, 1);

  if (dfn(opts.approve, true)) {
    expect(await preApprove(vToken, minter, mintAmount, opts)).toSucceed();
  }
  if (dfn(opts.exchangeRate)) {
    expect(await send(vToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(vToken, 'mint', [mintAmount], { from: minter });
}


async function preSupply(vToken, account, tokens, opts = {}) {
  if (dfn(opts.total, true)) {
    expect(await send(vToken, 'harnessSetTotalSupply', [tokens])).toSucceed();
  }
  return send(vToken, 'harnessSetBalance', [account, tokens]);
}

async function quickRedeem(vToken, redeemer, redeemTokens, opts = {}) {
  await fastForward(vToken, 1);

  if (dfn(opts.supply, true)) {
    expect(await preSupply(vToken, redeemer, redeemTokens, opts)).toSucceed();
  }
  if (dfn(opts.exchangeRate)) {
    expect(await send(vToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(vToken, 'redeem', [redeemTokens], { from: redeemer });
}

async function quickRedeemUnderlying(vToken, redeemer, redeemAmount, opts = {}) {
  await fastForward(vToken, 1);

  if (dfn(opts.exchangeRate)) {
    expect(await send(vToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(vToken, 'redeemUnderlying', [redeemAmount], { from: redeemer });
}

async function setOraclePrice(vToken, price) {
  return send(vToken.controller.priceOracle, 'setUnderlyingPrice', [vToken._address, etherMantissa(price)]);
}

async function setBorrowRate(vToken, rate) {
  return send(vToken.interestRateModel, 'setBorrowRate', [etherMantissa(rate)]);
}

async function getBorrowRate(interestRateModel, cash, borrows, reserves) {
  return call(interestRateModel, 'getBorrowRate', [cash, borrows, reserves].map(etherUnsigned));
}

async function getSupplyRate(interestRateModel, cash, borrows, reserves, reserveFactor) {
  return call(interestRateModel, 'getSupplyRate', [cash, borrows, reserves, reserveFactor].map(etherUnsigned));
}

async function pretendBorrow(vToken, borrower, accountIndex, marketIndex, principalRaw, blockNumber = 2e7) {
  await send(vToken, 'harnessSetTotalBorrows', [etherUnsigned(principalRaw)]);
  await send(vToken, 'harnessSetAccountBorrows', [borrower, etherUnsigned(principalRaw), etherMantissa(accountIndex)]);
  await send(vToken, 'harnessSetBorrowIndex', [etherMantissa(marketIndex)]);
  await send(vToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(blockNumber)]);
  await send(vToken, 'harnessSetBlockNumber', [etherUnsigned(blockNumber)]);
}

module.exports = {
  makeController,
  makeVToken,
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
