const { call, send } = require('../Utils/MochaTruffle');
const {
  makeComptroller,
  makeCToken
} = require('../Utils/Compound');

contract('CToken', function ([root, ...accounts]) {
  let cToken, oldComptroller, newComptroller;
  before(async () => {
    cToken = await makeCToken();
    oldComptroller = cToken.comptroller;
    newComptroller = await makeComptroller();
    assert.notEqual(newComptroller._address, oldComptroller._address, 'setup failed');
  });

  describe('_setComptroller', async () => {
    it("should fail if called by non-admin", async () => {
      assert.hasTokenFailure(
        await send(cToken, '_setComptroller', [newComptroller._address], { from: accounts[0] }),
        'UNAUTHORIZED',
        'SET_COMPTROLLER_OWNER_CHECK'
      );
      assert.equal(await call(cToken, 'comptroller'), oldComptroller._address);
    });

    it("reverts if passed a contract that doesn't implement isComptroller", async () => {
      await assert.revert(send(cToken, '_setComptroller', [cToken.underlying._address]), "revert");
      assert.equal(await call(cToken, 'comptroller'), oldComptroller._address);
    });

    it("reverts if passed a contract that implements isComptroller as false", async () => {
      // extremely unlikely to occur, of course, but let's be exhaustive
      const badComptroller = await makeComptroller({ kind: 'false-marker' });
      await assert.revert(send(cToken, '_setComptroller', [badComptroller._address]), "revert marker method returned false");
      assert.equal(await call(cToken, 'comptroller'), oldComptroller._address);
    });

    it("updates comptroller and emits log on success", async () => {
      const result = await send(cToken, '_setComptroller', [newComptroller._address]);
      assert.success(result);
      assert.hasLog(result, 'NewComptroller', {
        oldComptroller: oldComptroller._address,
        newComptroller: newComptroller._address
      });
      assert.equal(await call(cToken, 'comptroller'), newComptroller._address);
    });
  });
});
