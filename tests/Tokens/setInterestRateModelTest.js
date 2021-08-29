const {both} = require('../Utils/Ethereum');
const {
  fastForward,
  makeCToken,
  makeInterestRateModel
} = require('../Utils/Compound');

describe('CToken', function () {
  let root, accounts;
  let newModel;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    newModel = await makeInterestRateModel();
  });

  describe("_setInterestRateModelFresh", () => {
    let cToken, oldModel;
    beforeEach(async () => {
      cToken = await makeCToken();
      oldModel = cToken.interestRateModel;
      expect(oldModel._address).not.toEqual(newModel._address);
    });

    it("fails if called by non-admin", async () => {
      await expect(send(cToken, 'harnessSetInterestRateModelFresh', [newModel._address], {from: accounts[0]}))
        .rejects.toRevertWithCustomError('SetInterestRateModelOwnerCheck');
      expect(await call(cToken, 'interestRateModel')).toEqual(oldModel._address);
    });

    it("fails if market not fresh", async () => {
      expect(await send(cToken, 'harnessFastForward', [5])).toSucceed();
      await expect(send(cToken, 'harnessSetInterestRateModelFresh', [newModel._address]))
        .rejects.toRevertWithCustomError('SetInterestRateModelFreshCheck');
      expect(await call(cToken, 'interestRateModel')).toEqual(oldModel._address);
    });

    it("reverts if passed a contract that doesn't implement isInterestRateModel", async () => {
      await expect(send(cToken, 'harnessSetInterestRateModelFresh', [cToken.underlying._address]))
        .rejects.toRevert();
      expect(await call(cToken, 'interestRateModel')).toEqual(oldModel._address);
    });

    it("reverts if passed a contract that implements isInterestRateModel as false", async () => {
      // extremely unlikely to occur, of course, but let's be exhaustive
      const badModel = await makeInterestRateModel({kind: 'false-marker'});
      await expect(send(cToken, 'harnessSetInterestRateModelFresh', [badModel._address]))
        .rejects.toRevert("revert marker method returned false");
      expect(await call(cToken, 'interestRateModel')).toEqual(oldModel._address);
    });

    it("accepts new valid interest rate model", async () => {
      expect(await send(cToken, 'harnessSetInterestRateModelFresh', [newModel._address]))
        .toSucceed();
      expect(await call(cToken, 'interestRateModel')).toEqual(newModel._address);
    });

    it("emits expected log when accepting a new valid interest rate model", async () => {
      const result = await send(cToken, 'harnessSetInterestRateModelFresh', [newModel._address]);
      expect(result).toSucceed();
      expect(result).toHaveLog('NewMarketInterestRateModel', {
        oldInterestRateModel: oldModel._address,
        newInterestRateModel: newModel._address,
      });
      expect(await call(cToken, 'interestRateModel')).toEqual(newModel._address);
    });
  });

  describe("_setInterestRateModel", () => {
    let cToken;
    beforeEach(async () => {
      cToken = await makeCToken();
    });

    beforeEach(async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
    });

    it("emits a set market interest rate model failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await fastForward(cToken, 1);
      await expect(send(cToken, '_setInterestRateModel', [newModel._address])).rejects.toRevert('revert INTEREST_RATE_MODEL_ERROR');
    });

    it("reverts from _setInterestRateModelFresh", async () => {
      await expect(send(cToken, '_setInterestRateModel', [newModel._address], {from: accounts[0]}))
        .rejects.toRevertWithCustomError('SetInterestRateModelOwnerCheck');
    });

    it("reports success when _setInterestRateModelFresh succeeds", async () => {
      const {reply, receipt} = await both(cToken, '_setInterestRateModel', [newModel._address]);
      expect(reply).toEqualNumber(0);
      expect(receipt).toSucceed();
      expect(await call(cToken, 'interestRateModel')).toEqual(newModel._address);
    });
  });
});
