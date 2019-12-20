const { call } = require('../Utils/MochaTruffle');
const {
  makeInterestRateModel,
  getBorrowRate,
  getSupplyRate
} = require('../Utils/Compound');


function utilizationRate(cash, borrows, reserves) {
  return borrows ? borrows / (cash + borrows - reserves) : 0;
}

function whitePaperRateFn(base, slope, jump = 0.8, kink = 0.9) {
  return (cash, borrows, reserves) => {
    const ur = utilizationRate(cash, borrows, reserves);

    if (ur <= kink) {
      return (ur * slope + base) / blocksPerYear;
    } else {
      const excessUtil = ur - kink;
      return ((excessUtil * jump) + (kink * slope) + base) / blocksPerYear;
    }
  }
}

function supplyRateFn(base, slope, jump, kink, cash, borrows, reserves, reserveFactor = 0.1) {
  const ur = utilizationRate(cash, borrows, reserves);
  const borrowRate = whitePaperRateFn(base, slope, jump, kink)(cash, borrows, reserves);

  return borrowRate * (1 - reserveFactor) * ur;
}

function makeUtilization(util) {
  if (util == 0e18) {
    return {
      borrows: 0,
      reserves: 0,
      cash: 0
    };
  } else {
    // borrows / (cash + borrows - reserves) = util
    // let borrows = 1
    // let reserves = 1
    // 1 / ( cash + 1 - 1 ) = util
    // util = 1 / cash
    // cash = 1 / util
    borrows = 1e18;
    reserves = 1e18;
    cash = 1e36 / util;

    return {
      borrows,
      cash,
      reserves
    };
  }
}

const ExpectedRates = {
  'baseP025-slopeP20': { base: 0.025, slope: 0.20 },
  'baseP05-slopeP45': { base: 0.05, slope: 0.45 },
  'white-paper': { base: 0.1, slope: 0.45 },
  'jump-rate': { base: 0.1, slope: 0.45 }
}

const blocksPerYear = 2102400;
const rateInputs = [
  [500, 100],
  [3e18, 5e18],
  [5e18, 3e18],
  [500, 3e18],
  [0, 500],
  [500, 0],
  [0, 0],
  [3e18, 500],
  ["1000.00000000e18", "310.00000000e18"],
  ["690.00000000e18", "310.00000000e18"]
].map(vs => vs.map(Number));

contract('InterestRateModel', async function ([root, ...accounts]) {
  Object.entries(ExpectedRates).forEach(async ([kind, info]) => {
    let model;
    before(async () => {
      model = await makeInterestRateModel({ kind: kind == 'jump-rate' ? 'jump-rate' : 'white-paper', baseRate: info.base, multiplier: info.slope });
    });

    const rateCases = (rateFn) => {
      rateInputs.forEach(([cash, borrows, reserves = 0]) => {
        it(`calculates correct borrow value for ${cash}, ${borrows}, ${reserves}`, async () => {
          const expected = rateFn(cash, borrows, reserves);
          assert.like(
            await getBorrowRate(model, cash, borrows, reserves),
            (x) => assert.approximately(Number(x) / 1e18, expected, 1e7)
          );
        });
      });
    };

    describe(kind, async () => {
      it('isInterestRateModel', async () => {
        assert.equal(await call(model, 'isInterestRateModel'), true);
      });

      rateCases(whitePaperRateFn(info.base, info.slope));

      if (kind == 'jump-rate') {
        // Only need to do these for the WhitePaper

        it('handles overflowed cash + borrows', async () => {
          await assert.revert(getBorrowRate(model, -1, -1, 0), "revert SafeMath: addition overflow");
        });

        it('handles failing to get exp of borrows / cash + borrows', async () => {
          await assert.revert(getBorrowRate(model, 0, -1, 0), "revert SafeMath: multiplication overflow");
        });

        it('handles overflow utilization rate times slope', async () => {
          const badModel = await makeInterestRateModel({ kind, baseRate: 0, multiplier: -1, jump: -1 });
          await assert.revert(getBorrowRate(badModel, 1, 1, 0), "revert SafeMath: multiplication overflow");
        });

        it('handles overflow utilization rate times slope + base', async () => {
          const badModel = await makeInterestRateModel({ kind, baseRate: -1, multiplier: 1e48, jump: 1e48 });
          await assert.revert(getBorrowRate(badModel, 0, 1, 0), "revert SafeMath: multiplication overflow");
        });

        describe('chosen points', () => {
          const tests = [
            {
              jump: 100,
              kink: 90,
              base: 10,
              slope: 20,
              points: [
                [0, 10],
                [10, 12],
                [89, 27.8],
                [90, 28],
                [91, 29],
                [100, 38]
              ]
            },
            {
              jump: 20,
              kink: 90,
              base: 10,
              slope: 20,
              points: [
                [0, 10],
                [10, 12],
                [100, 30]
              ]
            },
            {
              jump: 0,
              kink: 90,
              base: 10,
              slope: 20,
              points: [
                [0, 10],
                [10, 12],
                [100, 28]
              ]
            },
            {
              jump: 0,
              kink: 110,
              base: 10,
              slope: 20,
              points: [
                [0, 10],
                [10, 12],
                [100, 30]
              ]
            },
            {
              jump: 2000,
              kink: 0,
              base: 10,
              slope: 20,
              points: [
                [0, 10],
                [10, 210],
                [100, 2010]
              ]
            }
          ].forEach(({jump, kink, base, slope, points}) => {
            describe(`for jump=${jump}, kink=${kink}, base=${base}, slope=${slope}`, async () => {
              let jumpModel;

              before(async () => {
                jumpModel = await makeInterestRateModel({
                  kind: 'jump-rate',
                  baseRate: base / 100,
                  multiplier: slope / 100,
                  jump: jump / 100,
                  kink: kink / 100,
                });
              });

              points.forEach(([util, expected]) => {
                it(`and util=${util}%`, async () => {
                  const {borrows, cash, reserves} = makeUtilization(util * 1e16);
                  const result = await getBorrowRate(jumpModel, cash, borrows, reserves);
                  const actual = Number(result) / 1e16 * blocksPerYear;

                  assert.approximately(actual, expected, 1e-2);
                });
              });
            });
          });
        });

        describe('ranges', () => {
          const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
          const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

          let jumps = [
            0,
            0.02e18,
            0.03e18,
            0.10e18,
            10.0e18
          ];

          let kinks = [
            0e18,
            0.0001e18,
            0.02e18,
            0.5e18,
            0.99e18,
            1.0e18
          ];

          cartesian(jumps, kinks).forEach(([jump, kink]) => {
            let base = 0.02e18;
            let slope = 0.2e18;
            let utils = [
              0e18,
              0.1e18,
              0.5e18,
              0.75e18,
              1.0e18,
              1.5e18,
              10.0e18,
              kink - 0.00001e18,
              kink,
              kink + 0.00001e18
            ].filter((util) => util >= 0);

            utils.forEach(async (util) => {
              it(`has correct curve for kink=${kink/1e16}%, util=${util/1e16}%`, async () => {
                let {borrows, cash, reserves} = makeUtilization(util);

                let calculated = borrows / (cash + borrows - reserves);

                const altModel = await makeInterestRateModel({
                  kind: 'jump-rate',
                  baseRate: base / 1e18,
                  multiplier: slope / 1e18,
                  jump: jump / 1e18,
                  kink: kink
                });

                const expected = whitePaperRateFn(base / 1e18, slope / 1e18, jump / 1e18, kink / 1e18)(cash, borrows, reserves);
                const result = await getBorrowRate(altModel, cash, borrows, reserves);

                assert.like(
                  await result,
                  (x) => assert.approximately(Number(x) / 1e18, expected, 1e-3)
                );
              });
            });
          });
        });

        describe('getBorrowRate', async () => {
          // We'll generate a large number of tests to verify approximate accuracy
          [
            // Description of tests arrays:
            // [base, slope, cash, borrows]

            // 50% base and 45% slope
            [0.5e18, 0.45e18, 500, 100],
            [0.5e18, 0.45e18, 3e18, 5e18],
            [0.5e18, 0.45e18, 5e18, 3e18],
            [0.5e18, 0.45e18, 500, 3e18],
            [0.5e18, 0.45e18, 0, 500],
            [0.5e18, 0.45e18, 500, 0],
            [0.5e18, 0.45e18, 0, 0],
            [0.5e18, 0.45e18, 3e18, 500],
            [0.5e18, 0.45e18, "1000.00000000e18", "310.00000000e18"],
            [0.5e18, 0.45e18, "690.00000000e18", "310.00000000e18"],

            // 10% base and 200% slope
            [0.1e18, 2.0e18, 500, 100],
            [0.1e18, 2.0e18, 3e18, 5e18],
            [0.1e18, 2.0e18, 5e18, 3e18],
            [0.1e18, 2.0e18, 500, 3e18],
            [0.1e18, 2.0e18, 0, 500],
            [0.1e18, 2.0e18, 500, 0],
            [0.1e18, 2.0e18, 0, 0],
            [0.1e18, 2.0e18, 3e18, 500],

            // 2000% base and 4000% slope
            [20.0e18, 40.0e18, 500, 100],
            [20.0e18, 40.0e18, 3e18, 5e18],
            [20.0e18, 40.0e18, 5e18, 3e18],
            [20.0e18, 40.0e18, 500, 3e18],
            [20.0e18, 40.0e18, 0, 500],
            [20.0e18, 40.0e18, 500, 0],
            [20.0e18, 40.0e18, 0, 0],
            [20.0e18, 40.0e18, 3e18, 500],
          ].map(vs => vs.map(Number))
            .forEach(([base, slope, cash, borrows, reserves = 0, jump = 0.8e18, kink = 0.9e18]) => { // XXX add reserves
              it(`calculates correct borrow value for base=${base / 1e16}%,slope=${slope / 1e16}%, cash=${cash}, borrows=${borrows}`, async () => {
                const altModel = await makeInterestRateModel({kind: 'jump-rate', baseRate: base / 1e18, multiplier: slope / 1e18, jump: jump / 1e18, kink: kink / 1e18});
                const expected = whitePaperRateFn(base / 1e18, slope / 1e18, jump / 1e18, kink / 1e18)(cash, borrows, reserves);
                assert.like(
                  await getBorrowRate(altModel, cash, borrows, reserves),
                  (x) => assert.approximately(Number(x) / 1e18, expected, 1e-8)
                );
              });
            });
        });

        describe('getSupplyRate', async () => {
          // We'll generate a large number of tests to verify approximate accuracy
          [
            // Description of tests arrays:
            // [base, slope, cash, borrows]

            // 50% base and 45% slope
            [0.5e18, 0.45e18, 500, 100],
            [0.5e18, 0.45e18, 3e18, 5e18],
            [0.5e18, 0.45e18, 5e18, 3e18],
            [0.5e18, 0.45e18, 500, 3e18],
            [0.5e18, 0.45e18, 0, 500],
            [0.5e18, 0.45e18, 500, 0],
            [0.5e18, 0.45e18, 0, 0],
            [0.5e18, 0.45e18, 3e18, 500],
            [0.5e18, 0.45e18, "1000.00000000e18", "310.00000000e18"],
            [0.5e18, 0.45e18, "690.00000000e18", "310.00000000e18"],

            // 10% base and 200% slope
            [0.1e18, 2.0e18, 500, 100],
            [0.1e18, 2.0e18, 3e18, 5e18],
            [0.1e18, 2.0e18, 5e18, 3e18],
            [0.1e18, 2.0e18, 500, 3e18],
            [0.1e18, 2.0e18, 0, 500],
            [0.1e18, 2.0e18, 500, 0],
            [0.1e18, 2.0e18, 0, 0],
            [0.1e18, 2.0e18, 3e18, 500],

            // 2000% base and 4000% slope
            [20.0e18, 40.0e18, 500, 100],
            [20.0e18, 40.0e18, 3e18, 5e18],
            [20.0e18, 40.0e18, 5e18, 3e18],
            [20.0e18, 40.0e18, 500, 3e18],
            [20.0e18, 40.0e18, 0, 500],
            [20.0e18, 40.0e18, 500, 0],
            [20.0e18, 40.0e18, 0, 0],
            [20.0e18, 40.0e18, 3e18, 500],
          ].map(vs => vs.map(Number))
            .forEach(([base, slope, cash, borrows, reserves = 0, jump = slope * 5, kink = 0.9e18, reserveFactor = 0.1e18]) => { // XXX add reserves
              it(`calculates correct supply value for base=${base / 1e16}%, slope=${slope / 1e16}%, jump=${jump / 1e16}, cash=${cash}, borrows=${borrows}`, async () => {
                const altModel = await makeInterestRateModel({kind: 'jump-rate', baseRate: base / 1e18, multiplier: slope / 1e18, jump: jump / 1e18, kink: kink / 1e18});
                const expected = supplyRateFn(base / 1e18, slope / 1e18, jump / 1e18, kink / 1e18, cash, borrows, reserves, reserveFactor / 1e18);
                assert.like(
                  await getSupplyRate(altModel, cash, borrows, reserves, reserveFactor),
                  (x) => assert.approximately(Number(x) / 1e18, expected, 1e-8)
                );
              });
            });
        });
      }
    });
  });
});
