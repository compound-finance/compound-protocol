const { etherUnsigned, UInt256Max } = require("../Utils/Ethereum");
const {
  makeComptroller,
  makeXToken,
  setOraclePrice,
} = require("../Utils/Compound");

const borrowedPrice = 2e10;
const collateralPrice = 1e18;
const repayAmount = etherUnsigned(1e18);

async function calculateSeizeTokens(
  comptroller,
  cTokenBorrowed,
  cTokenCollateral,
  repayAmount
) {
  return call(comptroller, "liquidateCalculateSeizeTokens", [
    cTokenBorrowed._address,
    cTokenCollateral._address,
    repayAmount,
  ]);
}

function rando(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

describe("Comptroller", () => {
  let root, accounts;
  let comptroller, cTokenBorrowed, cTokenCollateral;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    comptroller = await makeComptroller();
    cTokenBorrowed = await makeXToken({
      comptroller: comptroller,
      underlyingPrice: 0,
    });
    cTokenCollateral = await makeXToken({
      comptroller: comptroller,
      underlyingPrice: 0,
    });
  });

  beforeEach(async () => {
    await setOraclePrice(cTokenBorrowed, borrowedPrice);
    await setOraclePrice(cTokenCollateral, collateralPrice);
    await send(cTokenCollateral, "harnessExchangeRateDetails", [8e10, 4e10, 0]);
  });

  describe("liquidateCalculateAmountSeize", () => {
    it("fails if either asset price is 0", async () => {
      await setOraclePrice(cTokenBorrowed, 0);
      expect(
        await calculateSeizeTokens(
          comptroller,
          cTokenBorrowed,
          cTokenCollateral,
          repayAmount
        )
      ).toHaveTrollErrorTuple(["PRICE_ERROR", 0]);

      await setOraclePrice(cTokenCollateral, 0);
      expect(
        await calculateSeizeTokens(
          comptroller,
          cTokenBorrowed,
          cTokenCollateral,
          repayAmount
        )
      ).toHaveTrollErrorTuple(["PRICE_ERROR", 0]);
    });

    it("fails if the repayAmount causes overflow ", async () => {
      await expect(
        calculateSeizeTokens(
          comptroller,
          cTokenBorrowed,
          cTokenCollateral,
          UInt256Max()
        )
      ).rejects.toRevert();
    });

    it("fails if the borrowed asset price causes overflow ", async () => {
      await setOraclePrice(cTokenBorrowed, -1);
      await expect(
        calculateSeizeTokens(
          comptroller,
          cTokenBorrowed,
          cTokenCollateral,
          repayAmount
        )
      ).rejects.toRevert();
    });

    it("reverts if it fails to calculate the exchange rate", async () => {
      await send(cTokenCollateral, "harnessExchangeRateDetails", [1, 0, 10]); // (1 - 10) -> underflow
      await expect(
        send(comptroller, "liquidateCalculateSeizeTokens", [
          cTokenBorrowed._address,
          cTokenCollateral._address,
          repayAmount,
        ])
      ).rejects.toRevert();
    });

    [
      [1e18, 1e18, 1e18, 1e18, 1e18],
      [2e18, 1e18, 1e18, 1e18, 1e18],
      [2e18, 2e18, 1.42e18, 1.3e18, 2.45e18],
      [2.789e18, 5.230480842e18, 771.32e18, 1.3e18, 10002.45e18],
      [
        7.009232529961056e24,
        2.5278726317240445e24,
        2.6177112093242585e23,
        1179713989619784000,
        7.790468414639561e24,
      ],
      [
        rando(0, 1e25),
        rando(0, 1e25),
        rando(1, 1e25),
        rando(1e18, 1.5e18),
        rando(0, 1e25),
      ],
    ].forEach((testCase) => {
      it(`returns the correct value for ${testCase}`, async () => {
        const [
          exchangeRate,
          borrowedPrice,
          collateralPrice,
          liquidationIncentive,
          repayAmount,
        ] = testCase.map(etherUnsigned);

        await setOraclePrice(cTokenCollateral, collateralPrice);
        await setOraclePrice(cTokenBorrowed, borrowedPrice);
        await send(comptroller, "_setLiquidationIncentive", [
          liquidationIncentive,
        ]);
        await send(cTokenCollateral, "harnessSetExchangeRate", [exchangeRate]);

        const seizeAmount = repayAmount
          .multipliedBy(liquidationIncentive)
          .multipliedBy(borrowedPrice)
          .dividedBy(collateralPrice);
        const seizeTokens = seizeAmount.dividedBy(exchangeRate);

        expect(
          await calculateSeizeTokens(
            comptroller,
            cTokenBorrowed,
            cTokenCollateral,
            repayAmount
          )
        ).toHaveTrollErrorTuple(
          ["NO_ERROR", Number(seizeTokens)],
          (x, y) => Math.abs(x - y) < 1e7
        );
      });
    });
  });
});
