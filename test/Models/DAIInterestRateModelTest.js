const Ganache = require('ganache-core');
const Web3 = require('web3');
const BigNum = require('bignumber.js')

const { call, etherUnsigned, getContract, getContractDefaults, getTestContract } = require('../Utils/MochaTruffle');
const { getBorrowRate, getSupplyRate } = require('../Utils/Compound');

const secondsPerYear = 60 * 60 * 24 * 365;

function utilizationRate(cash, borrows, reserves) {
  return borrows ? borrows / (cash + borrows - reserves) : 0;
}

function baseRoofRateFn(dsr, duty, mkrBase, kink, jump, cash, borrows, reserves) {
  const stabilityFee = (duty + mkrBase - 1) * 15;
  const dsrPerBlock = (dsr - 1) * 15;
  const base = dsrPerBlock / 0.9;
  const slope = (stabilityFee - base) / kink;

  const ur = utilizationRate(cash, borrows, reserves);

  if (ur <= kink) {
    return ur * slope + base;
  } else {
    const excessUtil = ur - kink;
    const jumpMultiplier = jump * slope;
    return (excessUtil * jumpMultiplier) + (kink * slope) + base;
  }
}

function daiSupplyRate(dsr, duty, mkrBase, kink, jump, cash, borrows, reserves, reserveFactor = 0.1) {
  const dsrPerBlock = (dsr - 1) * 15;
  const ur = utilizationRate(cash, borrows, reserves);
  const borrowRate = baseRoofRateFn(dsr, duty, mkrBase, kink, jump, cash, borrows, reserves);
  const underlying = cash + borrows - reserves;
  const lendingSupplyRate = borrowRate * (1 - reserveFactor) * ur;

  if (underlying == 0) {
    return lendingSupplyRate;
  }
  const cashSupplyRate = (new BigNum(cash)).times(new BigNum(dsrPerBlock)).div(underlying);
  return cashSupplyRate.plus(lendingSupplyRate).toNumber();
}


contract('DAIInterestRateModel', async function (_accounts) {
  let kovanWeb3;
  let fork = "https://kovan.infura.io/v3/e1a5d4d2c06a4e81945fca56d0d5d8ea@14764778";
  let root;
  let accounts;
  before(async () => {
    kovanWeb3 = new Web3(
      Ganache.provider({
        allowUnlimitedContractSize: true,
        fork: fork,
        gasLimit: 20000000,
        gasPrice: '20000',
        port: 8546
      }));
    [root, ...accounts] = await kovanWeb3.eth.getAccounts();
  });

  describe("constructor", async () => {
    it("sets jug and ilk address and pokes", async () => {
      let contract = getContract("DAIInterestRateModel", getContractDefaults(), kovanWeb3);

      let model = await contract.deploy({
        arguments: [
          "0xea190dbdc7adf265260ec4da6e9675fd4f5a78bb",
          "0xcbb7718c9f39d05aeede1c472ca8bf804b2f1ead",
          etherUnsigned(0.9e18),
          etherUnsigned(5)
        ]
      })
        .send({ from: root });

      let args = [0.5e18, 0.45e18, 500].map(etherUnsigned);
      // let mult = await call(model, 'multiplierPerBlock');
      let sr = await call(model, 'getSupplyRate', [...args, etherUnsigned(0.1e18)]);
    });
  });

  describe('getBorrowRate', async () => {
    [
      // Description of tests arrays:
      // duty + base = stability fee
      // [dsr, duty, base, cash, borrows, reserves]

      // 2% dsr, 5% duty, 0.5% base
      [0.02e27, 0.05e27, 0.005e27, 500, 100],
      [0.02e27, 0.05e27, 0.005e27, 1000, 900],
      [0.02e27, 0.05e27, 0.005e27, 1000, 950],
      [0.02e27, 0.05e27, 0.005e27, 500, 100],
      [0.02e27, 0.05e27, 0.005e27, 3e18, 5e18],
      [0.02e27, 0.05e27, 0.005e27, 5e18, 3e18],
      [0.02e27, 0.05e27, 0.005e27, 500, 3e18],
      [0.02e27, 0.05e27, 0.005e27, 0, 500],
      [0.02e27, 0.05e27, 0.005e27, 0, 500, 100],
      [0.02e27, 0.05e27, 0.005e27, 500, 0],
      [0.02e27, 0.05e27, 0.005e27, 0, 0],
      [0.02e27, 0.05e27, 0.005e27, 3e18, 500],

      // 5.5% dsr, 18% duty, 0.5% base
      [0.055e27, 0.18e27, 0.005e27, 500, 100],
      [0.055e27, 0.18e27, 0.005e27, 1000, 900],
      [0.055e27, 0.18e27, 0.005e27, 1000, 950],
      [0.055e27, 0.18e27, 0.005e27, 500, 100],
      [0.055e27, 0.18e27, 0.005e27, 3e18, 5e18],
      [0.055e27, 0.18e27, 0.005e27, 5e18, 3e18],
      [0.055e27, 0.18e27, 0.005e27, 500, 3e18],
      [0.055e27, 0.18e27, 0.005e27, 0, 500],
      [0.055e27, 0.18e27, 0.005e27, 0, 500, 100],
      [0.055e27, 0.18e27, 0.005e27, 500, 0],
      [0.055e27, 0.18e27, 0.005e27, 0, 0],
      [0.055e27, 0.18e27, 0.005e27, 3e18, 500],

      // 0% dsr, 10% duty, 0.5% base
      [0e27, 0.1e27, 0.005e27, 500, 100],
      [0e27, 0.1e27, 0.005e27, 1000, 900],
      [0e27, 0.1e27, 0.005e27, 1000, 950],
      [0e27, 0.1e27, 0.005e27, 500, 100],
      [0e27, 0.1e27, 0.005e27, 3e18, 5e18],
      [0e27, 0.1e27, 0.005e27, 5e18, 3e18],
      [0e27, 0.1e27, 0.005e27, 500, 3e18],
      [0e27, 0.1e27, 0.005e27, 0, 500],
      [0e27, 0.1e27, 0.005e27, 0, 500, 100],
      [0e27, 0.1e27, 0.005e27, 500, 0],
      [0e27, 0.1e27, 0.005e27, 0, 0],
      [0e27, 0.1e27, 0.005e27, 3e18, 500],

    ].map(vs => vs.map(Number))
      .forEach(([dsr, duty, base, cash, borrows, reserves = 0, kink = 0.9e18, jump = 5]) => {
        it(`calculates correct borrow value for dsr=${(dsr / 1e25)}%, duty=${(duty / 1e25)}%, base=${(base / 1e25)}%, cash=${cash}, borrows=${borrows}, reserves=${reserves}`, async () => {
          const [root] = _accounts;

          const onePlusPerSecondDsr = 1e27 + (dsr / secondsPerYear);
          const onePlusPerSecondDuty = 1e27 + (duty / secondsPerYear);
          const perSecondBase = base / secondsPerYear;

          const Pot = getTestContract("MockPot");
          const Jug = getTestContract("MockJug");
          const DAIInterestRateModel = getContract("DAIInterestRateModel");

          const pot = await Pot.deploy({
            arguments: [
              etherUnsigned(onePlusPerSecondDsr)
            ]
          }).send({ from: root });

          const jug = await Jug.deploy({
            arguments: [
              etherUnsigned(onePlusPerSecondDuty),
              etherUnsigned(perSecondBase)
            ]
          }).send({ from: root });

          const daiIRM = await DAIInterestRateModel.deploy({
            arguments: [
              pot.options.address,
              jug.options.address,
              etherUnsigned(kink),
              etherUnsigned(jump)
            ]
          }).send({ from: root });

          const expected = baseRoofRateFn(onePlusPerSecondDsr / 1e27, onePlusPerSecondDuty / 1e27, perSecondBase / 1e27, kink / 1e18, jump, cash, borrows, reserves);
          assert.like(
            await getBorrowRate(daiIRM, cash, borrows, reserves),
            (x) => assert.approximately(Number(x) / 1e18, expected, 1e-8)
          );
        });
      });
  });

  describe('getSupplyRate', async () => {
    [
      // Description of tests arrays:
      // duty + base = stability fee
      // [dsr, duty, base, cash, borrows, reserves]

      // 2% dsr, 5% duty, 0.5% base
      [0.02e27, 0.05e27, 0.005e27, 500, 100],
      [0.02e27, 0.05e27, 0.005e27, 1000, 900],
      [0.02e27, 0.05e27, 0.005e27, 1000, 950],
      [0.02e27, 0.05e27, 0.005e27, 500, 100],
      [0.02e27, 0.05e27, 0.005e27, 3e18, 5e18],
      [0.02e27, 0.05e27, 0.005e27, 5e18, 3e18],
      [0.02e27, 0.05e27, 0.005e27, 500, 3e18],
      [0.02e27, 0.05e27, 0.005e27, 0, 500],
      [0.02e27, 0.05e27, 0.005e27, 0, 500, 100],
      [0.02e27, 0.05e27, 0.005e27, 500, 0],
      [0.02e27, 0.05e27, 0.005e27, 0, 0],
      [0.02e27, 0.05e27, 0.005e27, 3e18, 500],

      // 5.5% dsr, 18% duty, 0.5% base
      [0.055e27, 0.18e27, 0.005e27, 500, 100],
      [0.055e27, 0.18e27, 0.005e27, 1000, 900],
      [0.055e27, 0.18e27, 0.005e27, 1000, 950],
      [0.055e27, 0.18e27, 0.005e27, 500, 100],
      [0.055e27, 0.18e27, 0.005e27, 3e18, 5e18],
      [0.055e27, 0.18e27, 0.005e27, 5e18, 3e18],
      [0.055e27, 0.18e27, 0.005e27, 500, 3e18],
      [0.055e27, 0.18e27, 0.005e27, 0, 500],
      [0.055e27, 0.18e27, 0.005e27, 0, 500, 100],
      [0.055e27, 0.18e27, 0.005e27, 500, 0],
      [0.055e27, 0.18e27, 0.005e27, 0, 0],
      [0.055e27, 0.18e27, 0.005e27, 3e18, 500],

      // 0% dsr, 10% duty, 0.5% base
      [0e27, 0.1e27, 0.005e27, 500, 100],
      [0e27, 0.1e27, 0.005e27, 1000, 900],
      [0e27, 0.1e27, 0.005e27, 1000, 950],
      [0e27, 0.1e27, 0.005e27, 500, 100],
      [0e27, 0.1e27, 0.005e27, 3e18, 5e18],
      [0e27, 0.1e27, 0.005e27, 5e18, 3e18],
      [0e27, 0.1e27, 0.005e27, 500, 3e18],
      [0e27, 0.1e27, 0.005e27, 0, 500],
      [0e27, 0.1e27, 0.005e27, 0, 500, 100],
      [0e27, 0.1e27, 0.005e27, 500, 0],
      [0e27, 0.1e27, 0.005e27, 0, 0],
      [0e27, 0.1e27, 0.005e27, 3e18, 500],

    ].map(vs => vs.map(Number))
      .forEach(([dsr, duty, base, cash, borrows, reserves = 0, kink = 0.9e18, jump = 5, reserveFactor = 0.1e18]) => {
        it(`calculates correct supply value for dsr=${(dsr / 1e25)}%, duty=${(duty / 1e25)}%, base=${(base / 1e25)}%, cash=${cash}, borrows=${borrows}, reserves=${reserves}`, async () => {
          const [root] = _accounts;

          const onePlusPerSecondDsr = 1e27 + (dsr / secondsPerYear);
          const onePlusPerSecondDuty = 1e27 + (duty / secondsPerYear);
          const perSecondBase = base / secondsPerYear;

          const Pot = getTestContract("MockPot");
          const Jug = getTestContract("MockJug");
          const DAIInterestRateModel = getContract("DAIInterestRateModel");

          const pot = await Pot.deploy({
            arguments: [
              etherUnsigned(onePlusPerSecondDsr)
            ]
          }).send({ from: root });

          const jug = await Jug.deploy({
            arguments: [
              etherUnsigned(onePlusPerSecondDuty),
              etherUnsigned(perSecondBase)
            ]
          }).send({ from: root });

          const daiIRM = await DAIInterestRateModel.deploy({
            arguments: [
              pot.options.address,
              jug.options.address,
              etherUnsigned(kink),
              etherUnsigned(jump)
            ]
          }).send({ from: root });

          const expected = daiSupplyRate(onePlusPerSecondDsr / 1e27, onePlusPerSecondDuty / 1e27, perSecondBase / 1e27, kink / 1e18, jump, cash, borrows, reserves, reserveFactor / 1e18);
          assert.like(
            await getSupplyRate(daiIRM, cash, borrows, reserves, reserveFactor),
            (x) => assert.approximately(Number(x) / 1e18, expected, 1e-8)
          );
        });
      });
  });

});
