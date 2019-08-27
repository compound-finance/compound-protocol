const {call} = require('../Utils/MochaTruffle');
const {
  makeInterestRateModel,
  getBorrowRate
} = require('../Utils/Compound');


function utilizationRate(cash, borrows, reserves) {
  return borrows ? borrows / (cash + borrows) : 0;
}

function whitePaperRateFn(base, slope) {
  return (cash, borrows, reserves) => {
    const ua = utilizationRate(cash, borrows, reserves);
    return (ua * slope + base) / blocksPerYear;
  }
}

const ExpectedRates = {
  'baseP025-slopeP20': {base: 0.025, slope: 0.20},
  'baseP05-slopeP45': {base: 0.05, slope: 0.45},
  'white-paper': {base: 0.1, slope: 0.45}
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
      model = await makeInterestRateModel({kind: 'white-paper', baseRate: info.base, multiplier: info.slope});
    });

    const rateCases = (rateFn) => {
      rateInputs.forEach(([cash, borrows, reserves = 0]) => {
        it(`calculates correct borrow value for ${cash}, ${borrows}, ${reserves}`, async () => {
          const expected = rateFn(cash, borrows, reserves);
          assert.hasIRErrorTuple(
            await getBorrowRate(model, cash, borrows, reserves),
            ['NO_ERROR', (x) => assert.approximately(Number(x) / 1e18, expected, 1e7)]
          );
        });
      });
    };

    describe(kind, async () => {
      it('isInterestRateModel', async () => {
        assert.equal(await call(model, 'isInterestRateModel'), true);
      });

      rateCases(whitePaperRateFn(info.base, info.slope));

      if (kind == 'white-paper') {
        // Only need to do these for the WhitePaper

        it('handles overflowed cash + borrows', async () => {
          assert.hasIRErrorTuple(
            await getBorrowRate(model, -1, -1, 0),
            ['FAILED_TO_ADD_CASH_PLUS_BORROWS', 0]
          );
        });

        it('handles failing to get exp of borrows / cash + borrows', async() => {
          assert.hasIRErrorTuple(
            await getBorrowRate(model, 0, -1, 0),
            ['FAILED_TO_GET_EXP', 0]
          );
        });

        it('handles overflow utilization rate times slope', async() => {
          const badModel = await makeInterestRateModel({kind, baseRate: 0, multiplier: -1});
          assert.hasIRErrorTuple(
            await getBorrowRate(badModel, 1, 1, 0),
            ['FAILED_TO_MUL_UTILIZATION_RATE', 0]
          );
        });

        it('handles overflow utilization rate times slope', async() => {
          const badModel = await makeInterestRateModel({kind, baseRate: -1, multiplier: 1});
          assert.hasIRErrorTuple(
            await getBorrowRate(badModel, 1, 1, 0),
            ['FAILED_TO_ADD_BASE_RATE', 0]
          );
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
            .forEach(([base, slope, cash, borrows, reserves = 0]) => { // XXX add reserves
              it(`calculates correct borrow value for base=${base/1e16}%,slope=${slope/1e16}%, cash=${cash}, borrows=${borrows}`, async () => {
                const altModel = await makeInterestRateModel({kind: 'white-paper', baseRate: base / 1e18, multiplier: slope / 1e18});
                const expected = whitePaperRateFn(base / 1e18, slope / 1e18)(cash, borrows, reserves);
                assert.hasIRErrorTuple(
                  await getBorrowRate(altModel, cash, borrows, reserves),
                  ['NO_ERROR', (x) => assert.approximately(Number(x) / 1e18, expected, 1e-8)]
                );
              });
            });
        });
      }
    });
  })
});