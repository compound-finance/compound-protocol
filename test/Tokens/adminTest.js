const {address, call, send} = require('../Utils/MochaTruffle');
const {makeCToken} = require('../Utils/Compound');

contract('admin / _setPendingAdmin / _acceptAdmin', function([root, ...accounts]) {
  let cToken;
  beforeEach(async () => {
      cToken = await makeCToken();
  });

  describe('admin()', async () => {
    it('should return correct admin', async () => {
      assert.equal(await call(cToken, 'admin'), root);
    });
  });

  describe('pendingAdmin()', async () => {
    it('should return correct pending admin', async () => {
      assert.addressZero(await call(cToken, 'pendingAdmin'));
    });
  });

  describe('_setPendingAdmin()', async () => {
    it('should only be callable by admin', async () => {
      assert.hasTokenFailure(
        await send(cToken, '_setPendingAdmin', [accounts[0]], {from: accounts[0]}),
        'UNAUTHORIZED',
        'SET_PENDING_ADMIN_OWNER_CHECK'
      );

      // Check admin stays the same
      assert.equal(await call(cToken, 'admin'), root);
      assert.addressZero(await call(cToken, 'pendingAdmin'));
    });

    it('should properly set pending admin', async () => {
      assert.success(await send(cToken, '_setPendingAdmin', [accounts[0]]));

      // Check admin stays the same
      assert.equal(await call(cToken, 'admin'), root);
      assert.equal(await call(cToken, 'pendingAdmin'), accounts[0]);
    });

    it('should properly set pending admin twice', async () => {
      assert.success(await send(cToken, '_setPendingAdmin', [accounts[0]]));
      assert.success(await send(cToken, '_setPendingAdmin', [accounts[1]]));

      // Check admin stays the same
      assert.equal(await call(cToken, 'admin'), root);
      assert.equal(await call(cToken, 'pendingAdmin'), accounts[1]);
    });

    it('should emit event', async () => {
      const result = await send(cToken, '_setPendingAdmin', [accounts[0]]);
      assert.hasLog(result, 'NewPendingAdmin', {
        oldPendingAdmin: address(0),
        newPendingAdmin: accounts[0],
      });
    });
  });

  describe('_acceptAdmin()', async () => {
    it('should fail when pending admin is zero', async () => {
      assert.hasTokenFailure(
        await send(cToken, '_acceptAdmin'),
        'UNAUTHORIZED',
        'ACCEPT_ADMIN_PENDING_ADMIN_CHECK'
      );

      // Check admin stays the same
      assert.equal(await call(cToken, 'admin'), root);
      assert.addressZero(await call(cToken, 'pendingAdmin'));
    });

    it('should fail when called by another account (e.g. root)', async () => {
      assert.success(await send(cToken, '_setPendingAdmin', [accounts[0]]));
      assert.hasTokenFailure(
        await send(cToken, '_acceptAdmin'),
        'UNAUTHORIZED',
        'ACCEPT_ADMIN_PENDING_ADMIN_CHECK'
      );

      // Check admin stays the same
      assert.equal(await call(cToken, 'admin'), root);
      assert.equal(await call(cToken, 'pendingAdmin') [accounts[0]]);
    });

    it('should succeed and set admin and clear pending admin', async () => {
      assert.success(await send(cToken, '_setPendingAdmin', [accounts[0]]));
      assert.success(await send(cToken, '_acceptAdmin', [], {from: accounts[0]}));

      // Check admin stays the same
      assert.equal(await call(cToken, 'admin'), accounts[0]);
      assert.addressZero(await call(cToken, 'pendingAdmin'));
    });

    it('should emit log on success', async () => {
      assert.success(await send(cToken, '_setPendingAdmin', [accounts[0]]));
      const result = await send(cToken, '_acceptAdmin', [], {from: accounts[0]});
      assert.hasLog(result, 'NewAdmin', {
        oldAdmin: root,
        newAdmin: accounts[0],
      });
      assert.hasLog(result, 'NewPendingAdmin', {
        oldPendingAdmin: accounts[0],
        newPendingAdmin: address(0),
      });
    });
  });
});
