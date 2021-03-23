const {etherUnsigned, UInt256Max} = require('../Utils/Ethereum');
const {
  makeController,
  makeVToken,
  setOraclePrice
} = require('../Utils/Vortex');

const borrowedPrice = 2e10;
const collateralPrice = 1e18;
const repayAmount = etherUnsigned(1e18);

async function calculateSeizeTokens(controller, vTokenBorrowed, vTokenCollateral, repayAmount) {
  return call(controller, 'liquidateCalculateSeizeTokens', [vTokenBorrowed._address, vTokenCollateral._address, repayAmount]);
}

function rando(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

describe('Controller', () => {
  let root, accounts;
  let controller, vTokenBorrowed, vTokenCollateral;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    controller = await makeController();
    vTokenBorrowed = await makeVToken({controller: controller, underlyingPrice: 0});
    vTokenCollateral = await makeVToken({controller: controller, underlyingPrice: 0});
  });

  beforeEach(async () => {
    await setOraclePrice(vTokenBorrowed, borrowedPrice);
    await setOraclePrice(vTokenCollateral, collateralPrice);
    await send(vTokenCollateral, 'harnessExchangeRateDetails', [8e10, 4e10, 0]);
  });

  describe('liquidateCalculateAmountSeize', () => {
    it("fails if either asset price is 0", async () => {
      await setOraclePrice(vTokenBorrowed, 0);
      expect(
        await calculateSeizeTokens(controller, vTokenBorrowed, vTokenCollateral, repayAmount)
      ).toHaveTrollErrorTuple(['PRICE_ERROR', 0]);

      await setOraclePrice(vTokenCollateral, 0);
      expect(
        await calculateSeizeTokens(controller, vTokenBorrowed, vTokenCollateral, repayAmount)
      ).toHaveTrollErrorTuple(['PRICE_ERROR', 0]);
    });

    it("fails if the repayAmount causes overflow ", async () => {
      await expect(
        calculateSeizeTokens(controller, vTokenBorrowed, vTokenCollateral, UInt256Max())
      ).rejects.toRevert("revert multiplication overflow");
    });

    it("fails if the borrowed asset price causes overflow ", async () => {
      await setOraclePrice(vTokenBorrowed, -1);
      await expect(
        calculateSeizeTokens(controller, vTokenBorrowed, vTokenCollateral, repayAmount)
      ).rejects.toRevert("revert multiplication overflow");
    });

    it("reverts if it fails to calculate the exchange rate", async () => {
      await send(vTokenCollateral, 'harnessExchangeRateDetails', [1, 0, 10]); // (1 - 10) -> underflow
      await expect(
        send(controller, 'liquidateCalculateSeizeTokens', [vTokenBorrowed._address, vTokenCollateral._address, repayAmount])
      ).rejects.toRevert("revert exchangeRateStored: exchangeRateStoredInternal failed");
    });

    [
      [1e18, 1e18, 1e18, 1e18, 1e18],
      [2e18, 1e18, 1e18, 1e18, 1e18],
      [2e18, 2e18, 1.42e18, 1.3e18, 2.45e18],
      [2.789e18, 5.230480842e18, 771.32e18, 1.3e18, 10002.45e18],
      [ 7.009232529961056e+24,2.5278726317240445e+24,2.6177112093242585e+23,1179713989619784000,7.790468414639561e+24 ],
      [rando(0, 1e25), rando(0, 1e25), rando(1, 1e25), rando(1e18, 1.5e18), rando(0, 1e25)]
    ].forEach((testCase) => {
      it(`returns the correct value for ${testCase}`, async () => {
        const [exchangeRate, borrowedPrice, collateralPrice, liquidationIncentive, repayAmount] = testCase.map(etherUnsigned);

        await setOraclePrice(vTokenCollateral, collateralPrice);
        await setOraclePrice(vTokenBorrowed, borrowedPrice);
        await send(controller, '_setLiquidationIncentive', [liquidationIncentive]);
        await send(vTokenCollateral, 'harnessSetExchangeRate', [exchangeRate]);

        const seizeAmount = repayAmount.multipliedBy(liquidationIncentive).multipliedBy(borrowedPrice).dividedBy(collateralPrice);
        const seizeTokens = seizeAmount.dividedBy(exchangeRate);

        expect(
          await calculateSeizeTokens(controller, vTokenBorrowed, vTokenCollateral, repayAmount)
        ).toHaveTrollErrorTuple(
          ['NO_ERROR', Number(seizeTokens)],
          (x, y) => Math.abs(x - y) < 1e7
        );
      });
    });
  });
});
