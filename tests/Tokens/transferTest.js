const {makeVToken} = require('../Utils/Vortex');

describe('VToken', function () {
  let root, accounts;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe('transfer', () => {
    it("cannot transfer from a zero balance", async () => {
      const vToken = await makeVToken({supportMarket: true});
      expect(await call(vToken, 'balanceOf', [root])).toEqualNumber(0);
      expect(await send(vToken, 'transfer', [accounts[0], 100])).toHaveTokenFailure('MATH_ERROR', 'TRANSFER_NOT_ENOUGH');
    });

    it("transfers 50 tokens", async () => {
      const vToken = await makeVToken({supportMarket: true});
      await send(vToken, 'harnessSetBalance', [root, 100]);
      expect(await call(vToken, 'balanceOf', [root])).toEqualNumber(100);
      await send(vToken, 'transfer', [accounts[0], 50]);
      expect(await call(vToken, 'balanceOf', [root])).toEqualNumber(50);
      expect(await call(vToken, 'balanceOf', [accounts[0]])).toEqualNumber(50);
    });

    it("doesn't transfer when src == dst", async () => {
      const vToken = await makeVToken({supportMarket: true});
      await send(vToken, 'harnessSetBalance', [root, 100]);
      expect(await call(vToken, 'balanceOf', [root])).toEqualNumber(100);
      expect(await send(vToken, 'transfer', [root, 50])).toHaveTokenFailure('BAD_INPUT', 'TRANSFER_NOT_ALLOWED');
    });

    it("rejects transfer when not allowed and reverts if not verified", async () => {
      const vToken = await makeVToken({controllerOpts: {kind: 'bool'}});
      await send(vToken, 'harnessSetBalance', [root, 100]);
      expect(await call(vToken, 'balanceOf', [root])).toEqualNumber(100);

      await send(vToken.controller, 'setTransferAllowed', [false])
      expect(await send(vToken, 'transfer', [root, 50])).toHaveTrollReject('TRANSFER_CONTROLLER_REJECTION');

      await send(vToken.controller, 'setTransferAllowed', [true])
      await send(vToken.controller, 'setTransferVerify', [false])
      // no longer support verifyTransfer on vToken end
      // await expect(send(vToken, 'transfer', [accounts[0], 50])).rejects.toRevert("revert transferVerify rejected transfer");
    });
  });
});