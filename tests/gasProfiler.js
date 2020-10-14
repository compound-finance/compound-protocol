const {
  etherUnsigned,
  etherMantissa,
} = require('./Utils/Ethereum');

const {
  balanceOf,
  makeCToken,
  makeComptroller,
  fastForward,
  preApprove,
  preSupply,
  quickRedeem,
  pretendBorrow,
  quickMint,
  vestAll,
} = require('./Utils/Compound');

const fs = require('fs');
const util = require('util');
const diffStringsUnified = require('jest-diff').default;


async function traceReceipt(receipt) {
  const opcodeCount = {};
  await saddle.trace(receipt, {
    execLog: log => {
      if (log.lastLog != undefined) {
        const key = `${log.op} @ ${log.gasCost}`;
        opcodeCount[key] = (opcodeCount[key] || 0) + 1;
      }
    }
  });
  return opcodeCount;
};


async function preRedeem(
  cToken,
  redeemer,
  redeemTokens,
  redeemAmount,
  exchangeRate
) {
  await preSupply(cToken, redeemer, redeemTokens);
  await send(cToken.underlying, 'harnessSetBalance', [
    cToken._address,
    redeemAmount
  ]);
}

const sortOpcodes = (opcodesMap) => {
  return Object.values(opcodesMap)
    .map(elem => [elem.fee, elem.name])
    .sort((a, b) => b[0] - a[0]);
};

const getGasCostFile = name => {
  try {
    const jsonString = fs.readFileSync(name);
    return JSON.parse(jsonString);
  } catch (err) {
    console.log(err);
    return {};
  }
};

const recordGasCost = (totalFee, key, filename, opcodes = {}) => {
  let fileObj = getGasCostFile(filename);
  const newCost = {fee: totalFee, opcodes: opcodes};
  console.log(diffStringsUnified(fileObj[key], newCost));
  fileObj[key] = newCost;
  fs.writeFileSync(filename, JSON.stringify(fileObj, null, ' '), 'utf-8');
};

async function mint(cToken, minter, mintAmount, exchangeRate) {
  expect(await preApprove(cToken, minter, mintAmount, {})).toSucceed();
  return send(cToken, 'mint', [mintAmount], { from: minter });
}

/// GAS PROFILER: saves a digest of the gas prices of common CToken operations
/// transiently fails, not sure why

describe('CToken', () => {
  let root, minter, redeemer, accounts, cToken;
  const exchangeRate = 50e3;
  const preMintAmount = etherUnsigned(30e4);
  const mintAmount = etherUnsigned(10e4);
  const mintTokens = mintAmount.div(exchangeRate);
  const redeemTokens = etherUnsigned(10e3);
  const redeemAmount = redeemTokens.multipliedBy(exchangeRate);
  const filename = './gasCosts.json';

  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    comptroller = await makeComptroller({ kind: 'bool'});
    cToken = await makeCToken({
      comptroller: comptroller,
      interestRateModelOpts: { kind: 'white-paper'},
      exchangeRate
    });
  });

  it('first mint', async () => {
    await send(cToken, 'harnessSetAccrualBlockNumber', [40]);
    await send(cToken, 'harnessSetBlockNumber', [41]);

    const trxReceipt = await mint(cToken, minter, mintAmount, exchangeRate);
    recordGasCost(trxReceipt.gasUsed, 'first mint', filename);
  });

  it('second mint', async () => {
    await mint(cToken, minter, mintAmount, exchangeRate);

    await send(cToken, 'harnessSetAccrualBlockNumber', [40]);
    await send(cToken, 'harnessSetBlockNumber', [41]);

    const mint2Receipt = await mint(cToken, minter, mintAmount, exchangeRate);
    expect(Object.keys(mint2Receipt.events)).toEqual(['AccrueInterest', 'Transfer', 'Mint']);

    console.log(mint2Receipt.gasUsed);
    const opcodeCount = {};

    await saddle.trace(mint2Receipt, {
      execLog: log => {
        if (log.lastLog != undefined) {
          const key = `${log.op} @ ${log.gasCost}`;
          opcodeCount[key] = (opcodeCount[key] || 0) + 1;
        }
      }
    });

    recordGasCost(mint2Receipt.gasUsed, 'second mint', filename, opcodeCount);
  });

  it('second mint, no interest accrued', async () => {
    await mint(cToken, minter, mintAmount, exchangeRate);

    await send(cToken, 'harnessSetAccrualBlockNumber', [40]);
    await send(cToken, 'harnessSetBlockNumber', [40]);

    const mint2Receipt = await mint(cToken, minter, mintAmount, exchangeRate);
    expect(Object.keys(mint2Receipt.events)).toEqual(['Transfer', 'Mint']);
    recordGasCost(mint2Receipt.gasUsed, 'second mint, no interest accrued', filename);

    // console.log("NO ACCRUED");
    // const opcodeCount = {};
    // await saddle.trace(mint2Receipt, {
    //   execLog: log => {
    //     opcodeCount[log.op] = (opcodeCount[log.op] || 0) + 1;
    //   }
    // });
    // console.log(getOpcodeDigest(opcodeCount));
  });

  it('redeem', async () => {
    await preRedeem(cToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
    const trxReceipt = await quickRedeem(cToken, redeemer, redeemTokens);
    recordGasCost(trxReceipt.gasUsed, 'redeem', filename);
  });

  it.skip('print mint opcode list', async () => {
    await preMint(cToken, minter, mintAmount, mintTokens, exchangeRate);
    const trxReceipt = await quickMint(cToken, minter, mintAmount);
    const opcodeCount = {};
    await saddle.trace(trxReceipt, {
      execLog: log => {
        opcodeCount[log.op] = (opcodeCount[log.op] || 0) + 1;
      }
    });
    console.log(getOpcodeDigest(opcodeCount));
  });
});


describe('Vesting', () => {
  // use same initialisation as flywheel
  const filename = './gasCostsVesting.json';

  const compRate = etherUnsigned(1e18);
  const oneWeek = 46523 // 604800 / 13 seconds per block

  let root, a1, a2, a3, accounts;
  let comptroller, cLOW, cREP, cZRX, cEVIL;

  beforeEach(async () => {
    let interestRateModelOpts = {borrowRate: 0.000001};
    [root, a1, a2, a3, ...accounts] = saddle.accounts;
    comptroller = await makeComptroller();
    cLOW = await makeCToken({comptroller, supportMarket: true, underlyingPrice: 1, interestRateModelOpts});
    cREP = await makeCToken({comptroller, supportMarket: true, underlyingPrice: 2, interestRateModelOpts});
    cZRX = await makeCToken({comptroller, supportMarket: true, underlyingPrice: 3, interestRateModelOpts});
    cEVIL = await makeCToken({comptroller, supportMarket: false, underlyingPrice: 3, interestRateModelOpts});
    await send(comptroller, '_addCompMarkets', [[cLOW, cREP, cZRX].map(c => c._address)]);
  });

  it('show small gas cost before vesting event', async () => {
    const compRemaining = compRate.multipliedBy(100)
    const a2Balance0 = await balanceOf(cLOW, a2);
    const a3Balance0 = await balanceOf(cLOW, a3);

    await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
    await pretendBorrow(cLOW, a1, 1, 1, 100);
    await send(comptroller, 'refreshCompSpeeds');

    await vestAll(comptroller);

    // first two mint events happen before any vesting has occured
    const earlyMintReceipt = await quickMint(cLOW, a2, etherUnsigned(10e18));
    const secondMintReceipt = await quickMint(cLOW, a3, etherUnsigned(15e18));
    
    // next mints illustrate a mint straight after vesting (this user should get a higher gas fee) and follow up mints
    await fastForward(comptroller, 2 * oneWeek + 1);
    const rightAfterVestingReceipt = await quickMint(cLOW, a2, etherUnsigned(10e18));
    const secondAfterVestingReceipt = await quickMint(cLOW, a3, etherUnsigned(15e18));

    // final mint mints again, now with no extra COMP to claim
    const finalReceipt = await quickMint(cLOW, a2, etherUnsigned(10e18));

    const earlyMintOpcodeCount = await traceReceipt(earlyMintReceipt);
    const secondMintOpcodeCount = await traceReceipt(secondMintReceipt);
    const rightAfterVestingOpcodeCount = await traceReceipt(rightAfterVestingReceipt);
    const secondAfterVestingOpcodeCount = await traceReceipt(secondAfterVestingReceipt);
    const finalOpcodeCount = await traceReceipt(finalReceipt);

    recordGasCost(earlyMintReceipt.gasUsed, 'mint before vesting event', filename, earlyMintOpcodeCount);
    recordGasCost(secondMintReceipt.gasUsed, 'second early mint before vesting event', filename, secondMintOpcodeCount);
    recordGasCost(rightAfterVestingReceipt.gasUsed, 'mint right after vesting event', filename, rightAfterVestingOpcodeCount);
    recordGasCost(secondAfterVestingReceipt.gasUsed, 'second mint right after vesting event', filename, secondAfterVestingOpcodeCount);
    recordGasCost(finalReceipt.gasUsed, 'final mint with no extra COMP to claim', filename, finalOpcodeCount);
  });
});
