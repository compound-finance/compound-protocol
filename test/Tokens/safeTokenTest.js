const {
  call,
  send
} = require('../Utils/MochaTruffle');

const {
  makeCToken,
  getBalances,
  adjustBalances
} = require('../Utils/Compound');

const exchangeRate = 5;

contract('CEther', function ([root, nonRoot, ...accounts]) {
  let cToken;
  before(async () => {
    cToken = await makeCToken({kind: 'cether', comptrollerOpts: {kind: 'bool'}});
  });

  describe("getCashPrior", async () => {
    it("returns the amount of ether held by the cEther contract before the current message", async () => {
      assert.equal(await call(cToken, 'harnessGetCashPrior', [], {value: 100}), 0);
    });
  });

  describe("doTransferIn", async () => {
    it("succeeds if from is msg.nonRoot and amount is msg.value", async () => {
      assert.equal(await call(cToken, 'harnessDoTransferIn', [root, 100], {value: 100}), 100);
    });

    it("reverts if from != msg.sender", async () => {
      await assert.revert(call(cToken, 'harnessDoTransferIn', [nonRoot, 100], {value: 100}), "revert sender mismatch");
    });

    it("reverts if amount != msg.value", async () => {
      await assert.revert(call(cToken, 'harnessDoTransferIn', [root, 77], {value: 100}), "revert value mismatch");
    });

    describe("doTransferOut", async () => {
      it("transfers ether out", async () => {
        const beforeBalances = await getBalances([cToken], [nonRoot]);
        const receipt = await send(cToken, 'harnessDoTransferOut', [nonRoot, 77], {value: 77});
        const afterBalances = await getBalances([cToken], [nonRoot]);
        assert.success(receipt);
        assert.deepEqual(afterBalances, await adjustBalances(beforeBalances, [
          [cToken, nonRoot, 'eth', 77]
        ]));
      });

      it("reverts if it fails", async () => {
        await assert.revert(call(cToken, 'harnessDoTransferOut', [root, 77], {value: 0}));
      });
    });

    describe("checkTransferIn", async () => {
      it("succeeds", async () => {
        assert.hasError(await call(cToken, 'harnessCheckTransferIn', [root, 100], {value: 100}), 'NO_ERROR');
      });

      it("reverts if sender is not from", async () => {
        await assert.revert(call(cToken, 'harnessCheckTransferIn', [nonRoot, 100], {value: 100}), "revert sender mismatch");
      });

      it("reverts if amount is not msg.value", async () => {
        await assert.revert(call(cToken, 'harnessCheckTransferIn', [root, 77], {value: 100}), "revert value mismatch");
      });
    });
  });
});
