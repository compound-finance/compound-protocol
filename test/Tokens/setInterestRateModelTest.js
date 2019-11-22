const {both, call, send} = require('../Utils/MochaTruffle');
const {
  makeCToken,
  makeInterestRateModel
} = require('../Utils/Compound');

contract('CToken', function ([root, ...accounts]) {
  let newModel;
  before(async () => {
    newModel = await makeInterestRateModel();
  });

  describe("_setInterestRateModelFresh", async () => {
    let cToken, oldModel;
    beforeEach(async () => {
      cToken = await makeCToken();
      oldModel = cToken.interestRateModel;
      assert.notEqual(oldModel._address, newModel._address, 'setup failed');
    });

    it("fails if called by non-admin", async () => {
      assert.hasTokenFailure(
        await send(cToken, 'harnessSetInterestRateModelFresh', [newModel._address], {from: accounts[0]}),
        'UNAUTHORIZED',
        'SET_INTEREST_RATE_MODEL_OWNER_CHECK'
      );
      assert.equal(await call(cToken, 'interestRateModel'), oldModel._address);
    });

    it("fails if market not fresh", async () => {
      assert.success(await send(cToken, 'harnessFastForward', [5]));
      assert.hasTokenFailure(
        await send(cToken, 'harnessSetInterestRateModelFresh', [newModel._address]),
        'MARKET_NOT_FRESH',
        'SET_INTEREST_RATE_MODEL_FRESH_CHECK'
      );
      assert.equal(await call(cToken, 'interestRateModel'), oldModel._address);
    });

    it("reverts if passed a contract that doesn't implement isInterestRateModel", async () => {
      await assert.revert(send(cToken, 'harnessSetInterestRateModelFresh', [cToken.underlying._address]));
      assert.equal(await call(cToken, 'interestRateModel'), oldModel._address);
    });

    it("reverts if passed a contract that implements isInterestRateModel as false", async () => {
      // extremely unlikely to occur, of course, but let's be exhaustive
      const badModel = await makeInterestRateModel({kind: 'false-marker'});
      await assert.revert(send(cToken, 'harnessSetInterestRateModelFresh', [badModel._address]), "revert marker method returned false");
      assert.equal(await call(cToken, 'interestRateModel'), oldModel._address);
    });

    it("accepts new valid interest rate model", async () => {
      assert.success(await send(cToken, 'harnessSetInterestRateModelFresh', [newModel._address]));
      assert.equal(await call(cToken, 'interestRateModel'), newModel._address);
    });

    it("emits expected log when accepting a new valid interest rate model", async () => {
      const result = await send(cToken, 'harnessSetInterestRateModelFresh', [newModel._address]);
      assert.success(result);
      assert.hasLog(result, 'NewMarketInterestRateModel', {
        oldInterestRateModel: oldModel._address,
        newInterestRateModel: newModel._address,
      });
      assert.equal(await call(cToken, 'interestRateModel'), newModel._address);
    });
  });

  describe("_setInterestRateModel", async () => {
    let cToken;
    before(async () => {
      cToken = await makeCToken();
    });

    beforeEach(async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
    });

    it("emits a set market interest rate model failure if interest accrual fails", async () => {
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await assert.revert(send(cToken, '_setInterestRateModel', [newModel._address]), "revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from _setInterestRateModelFresh without emitting any extra logs", async () => {
      const {reply, receipt} = await both(cToken, '_setInterestRateModel', [newModel._address], {from: accounts[0]});
      assert.hasError(reply, 'UNAUTHORIZED');
      assert.hasTokenFailure(receipt,
        'UNAUTHORIZED',
        'SET_INTEREST_RATE_MODEL_OWNER_CHECK'
      );
    });

    it("reports success when _setInterestRateModelFresh succeeds", async () => {
      const {reply, receipt} = await both(cToken, '_setInterestRateModel', [newModel._address]);
      assert.equal(reply, 0, "return code should be 0");
      assert.success(receipt);
      assert.equal(await call(cToken, 'interestRateModel'), newModel._address);
    });
  });
});