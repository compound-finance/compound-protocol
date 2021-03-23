const {
  etherUnsigned,
  etherMantissa,
  etherExp,
} = require('./Utils/Ethereum');

const {
  makeController,
  makeVToken,
  preApprove,
  preSupply,
  quickRedeem,
} = require('./Utils/Vortex');

async function vtxBalance(controller, user) {
  return etherUnsigned(await call(controller.vtx, 'balanceOf', [user]))
}

async function vtxAccrued(controller, user) {
  return etherUnsigned(await call(controller, 'vtxAccrued', [user]));
}

async function fastForwardPatch(patch, controller, blocks) {
  if (patch == 'unitroller') {
    return await send(controller, 'harnessFastForward', [blocks]);
  } else {
    return await send(controller, 'fastForward', [blocks]);
  }
}

const fs = require('fs');
const util = require('util');
const diffStringsUnified = require('jest-diff').default;


async function preRedeem(
  vToken,
  redeemer,
  redeemTokens,
  redeemAmount,
  exchangeRate
) {
  await preSupply(vToken, redeemer, redeemTokens);
  await send(vToken.underlying, 'harnessSetBalance', [
    vToken._address,
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

async function mint(vToken, minter, mintAmount, exchangeRate) {
  expect(await preApprove(vToken, minter, mintAmount, {})).toSucceed();
  return send(vToken, 'mint', [mintAmount], { from: minter });
}

async function claimVtx(controller, holder) {
  return send(controller, 'claimVtx', [holder], { from: holder });
}

/// GAS PROFILER: saves a digest of the gas prices of common VToken operations
/// transiently fails, not sure why

describe('Gas report', () => {
  let root, minter, redeemer, accounts, vToken;
  const exchangeRate = 50e3;
  const preMintAmount = etherUnsigned(30e4);
  const mintAmount = etherUnsigned(10e4);
  const mintTokens = mintAmount.div(exchangeRate);
  const redeemTokens = etherUnsigned(10e3);
  const redeemAmount = redeemTokens.multipliedBy(exchangeRate);
  const filename = './gasCosts.json';

  describe('VToken', () => {
    beforeEach(async () => {
      [root, minter, redeemer, ...accounts] = saddle.accounts;
      vToken = await makeVToken({
        controllerOpts: { kind: 'bool'}, 
        interestRateModelOpts: { kind: 'white-paper'},
        exchangeRate
      });
    });

    it('first mint', async () => {
      await send(vToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(vToken, 'harnessSetBlockNumber', [41]);

      const trxReceipt = await mint(vToken, minter, mintAmount, exchangeRate);
      recordGasCost(trxReceipt.gasUsed, 'first mint', filename);
    });

    it('second mint', async () => {
      await mint(vToken, minter, mintAmount, exchangeRate);

      await send(vToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(vToken, 'harnessSetBlockNumber', [41]);

      const mint2Receipt = await mint(vToken, minter, mintAmount, exchangeRate);
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
      await mint(vToken, minter, mintAmount, exchangeRate);

      await send(vToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(vToken, 'harnessSetBlockNumber', [40]);

      const mint2Receipt = await mint(vToken, minter, mintAmount, exchangeRate);
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
      await preRedeem(vToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      const trxReceipt = await quickRedeem(vToken, redeemer, redeemTokens);
      recordGasCost(trxReceipt.gasUsed, 'redeem', filename);
    });

    it.skip('print mint opcode list', async () => {
      await preMint(vToken, minter, mintAmount, mintTokens, exchangeRate);
      const trxReceipt = await quickMint(vToken, minter, mintAmount);
      const opcodeCount = {};
      await saddle.trace(trxReceipt, {
        execLog: log => {
          opcodeCount[log.op] = (opcodeCount[log.op] || 0) + 1;
        }
      });
      console.log(getOpcodeDigest(opcodeCount));
    });
  });

  describe.each([
    ['unitroller-g6'],
    ['unitroller']
  ])('Vtx claims %s', (patch) => {
    beforeEach(async () => {
      [root, minter, redeemer, ...accounts] = saddle.accounts;
      controller = await makeController({ kind: patch });
      let interestRateModelOpts = {borrowRate: 0.000001};
      vToken = await makeVToken({controller, supportMarket: true, underlyingPrice: 2, interestRateModelOpts});
      if (patch == 'unitroller') {
        await send(controller, '_setVtxSpeed', [vToken._address, etherExp(0.05)]);
      } else {
        await send(controller, '_addVtxMarkets', [[vToken].map(c => c._address)]);
        await send(controller, 'setVtxSpeed', [vToken._address, etherExp(0.05)]);
      }
      await send(controller.vtx, 'transfer', [controller._address, etherUnsigned(50e18)], {from: root});
    });

    it(`${patch} second mint with vtx accrued`, async () => {
      await mint(vToken, minter, mintAmount, exchangeRate);

      await fastForwardPatch(patch, controller, 10);

      console.log('Vtx balance before mint', (await vtxBalance(controller, minter)).toString());
      console.log('Vtx accrued before mint', (await vtxAccrued(controller, minter)).toString());
      const mint2Receipt = await mint(vToken, minter, mintAmount, exchangeRate);
      console.log('Vtx balance after mint', (await vtxBalance(controller, minter)).toString());
      console.log('Vtx accrued after mint', (await vtxAccrued(controller, minter)).toString());
      recordGasCost(mint2Receipt.gasUsed, `${patch} second mint with vtx accrued`, filename);
    });

    it(`${patch} claim vtx`, async () => {
      await mint(vToken, minter, mintAmount, exchangeRate);

      await fastForwardPatch(patch, controller, 10);

      console.log('Vtx balance before claim', (await vtxBalance(controller, minter)).toString());
      console.log('Vtx accrued before claim', (await vtxAccrued(controller, minter)).toString());
      const claimReceipt = await claimVtx(controller, minter);
      console.log('Vtx balance after claim', (await vtxBalance(controller, minter)).toString());
      console.log('Vtx accrued after claim', (await vtxAccrued(controller, minter)).toString());
      recordGasCost(claimReceipt.gasUsed, `${patch} claim vtx`, filename);
    });
  });
});
