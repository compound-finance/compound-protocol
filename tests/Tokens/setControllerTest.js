const {
  makeController,
  makeVToken
} = require('../Utils/Vortex');

describe('VToken', function () {
  let root, accounts;
  let vToken, oldController, newController;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    vToken = await makeVToken();
    oldController = vToken.controller;
    newController = await makeController();
    expect(newController._address).not.toEqual(oldController._address);
  });

  describe('_setController', () => {
    it("should fail if called by non-admin", async () => {
      expect(
        await send(vToken, '_setController', [newController._address], { from: accounts[0] })
      ).toHaveTokenFailure('UNAUTHORIZED', 'SET_CONTROLLER_OWNER_CHECK');
      expect(await call(vToken, 'controller')).toEqual(oldController._address);
    });

    it("reverts if passed a contract that doesn't implement isController", async () => {
      await expect(send(vToken, '_setController', [vToken.underlying._address])).rejects.toRevert("revert");
      expect(await call(vToken, 'controller')).toEqual(oldController._address);
    });

    it("reverts if passed a contract that implements isController as false", async () => {
      // extremely unlikely to occur, of course, but let's be exhaustive
      const badController = await makeController({ kind: 'false-marker' });
      await expect(send(vToken, '_setController', [badController._address])).rejects.toRevert("revert marker method returned false");
      expect(await call(vToken, 'controller')).toEqual(oldController._address);
    });

    it("updates controller and emits log on success", async () => {
      const result = await send(vToken, '_setController', [newController._address]);
      expect(result).toSucceed();
      expect(result).toHaveLog('NewController', {
        oldController: oldController._address,
        newController: newController._address
      });
      expect(await call(vToken, 'controller')).toEqual(newController._address);
    });
  });
});
