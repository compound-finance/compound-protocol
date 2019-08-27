const {call, send} = require('../Utils/MochaTruffle');
const {makeCToken} = require('../Utils/Compound');

contract('CToken', function ([root, ...accounts]) {
  describe('transfer', () => {
    it("cannot transfer from a zero balance", async () => {
      const cToken = await makeCToken({supportMarket: true});
      assert.equal(await call(cToken, 'balanceOf', [root]), 0);
      assert.hasTokenFailure(
        await send(cToken, 'transfer', [accounts[0], 100]),
        'MATH_ERROR',
        'TRANSFER_NOT_ENOUGH'
      );
    });

    it("transfers 50 tokens", async () => {
      const cToken = await makeCToken({supportMarket: true});
      await send(cToken, 'harnessSetBalance', [root, 100]);
      assert.equal(await call(cToken, 'balanceOf', [root]), 100);
      await send(cToken, 'transfer', [accounts[0], 50]);
      assert.equal(await call(cToken, 'balanceOf', [root]), 50);
      assert.equal(await call(cToken, 'balanceOf', [accounts[0]]), 50);
    });

    it("doesn't transfer when src == dst", async () => {
      const cToken = await makeCToken({supportMarket: true});
      await send(cToken, 'harnessSetBalance', [root, 100]);
      assert.equal(await call(cToken, 'balanceOf', [root]), 100);
      assert.hasTokenFailure(
        await send(cToken, 'transfer', [root, 50]),
        'BAD_INPUT',
        'TRANSFER_NOT_ALLOWED'
      );
    });

    it("rejects transfer when not allowed and reverts if not verified", async () => {
      const cToken = await makeCToken({comptrollerOpts: {kind: 'bool'}});
      await send(cToken, 'harnessSetBalance', [root, 100]);
      assert.equal(await call(cToken, 'balanceOf', [root]), 100);

      await send(cToken.comptroller, 'setTransferAllowed', [false])
      assert.hasTrollReject(
        await send(cToken, 'transfer', [root, 50]),
        'TRANSFER_COMPTROLLER_REJECTION'
      );

      await send(cToken.comptroller, 'setTransferAllowed', [true])
      await send(cToken.comptroller, 'setTransferVerify', [false])
      await assert.revert(send(cToken, 'transfer', [accounts[0], 50]), "revert transferVerify rejected transfer");
    });
  });
});