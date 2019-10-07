const {
  call,
  encodeParameters,
  etherMantissa,
  bigNumberify,
  getTestContract,
  keccak256,
  send
} = require('./Utils/MochaTruffle');

const Timelock = getTestContract('TimelockHarness');
const oneWeekInSeconds = bigNumberify(7 * 24 * 60 * 60);
const zero = bigNumberify(0);
const gracePeriod = oneWeekInSeconds.mul(2);

contract('Timelock', function([root, notAdmin, newAdmin]) {
  let blockTimestamp;
  let timelock;
  let delay = oneWeekInSeconds;
  let newDelay = delay.mul(2);
  let target;
  let value = zero;
  let signature = 'setDelay(uint256)';
  let data = encodeParameters(['uint256'], [newDelay]);
  let revertData = encodeParameters(['uint256'], [bigNumberify(60 * 60)]);
  let eta;
  let queuedTxHash;

  before(async () => {
    timelock = await Timelock.deploy({
      arguments: [root, delay]
    }).send({ from: root });

    blockTimestamp = bigNumberify(await call(timelock, 'blockTimestamp'));
    target = timelock.options.address;
    eta = blockTimestamp.add(delay);

    queuedTxHash = keccak256(
      encodeParameters(
        ['address', 'uint256', 'string', 'bytes', 'uint256'],
        [target, value, signature, data, eta]
      )
    );
  });

  describe('constructor', async () => {
    it('sets address of admin', async () => {
      let configuredAdmin = await call(timelock, 'admin');
      assert.equal(configuredAdmin, root);
    });

    it('sets delay', async () => {
      let configuredDelay = await call(timelock, 'delay');
      assert.equal(configuredDelay, delay.toString());
    });
  });

  describe('setDelay', async () => {
    it('requires msg.sender to be Timelock', async () => {
      await assert.revert(
        send(timelock, 'setDelay', [delay], { from: root }),
        'revert Timelock::setDelay: Call must come from Timelock.'
      );
    });
  });

  describe('setAdmin', async () => {
    it('requires msg.sender to be Timelock', async () => {
      await assert.revert(
        send(timelock, 'setAdmin', [newAdmin], { from: root }),
        'revert Timelock::setAdmin: Call must come from Timelock.'
      );
    });
  });

  describe('queueTransaction', async () => {
    it('requires admin to be msg.sender', async () => {
      await assert.revert(
        send(timelock, 'queueTransaction', [target, value, signature, data, eta], { from: notAdmin }),
        'revert Timelock::queueTransaction: Call must come from admin.'
      );
    });

    it('requires eta to exceed delay', async () => {
      const etaLessThanDelay = blockTimestamp.add(delay).sub(1);

      await assert.revert(
        send(timelock, 'queueTransaction', [target, value, signature, data, etaLessThanDelay], {
          from: root
        }),
        'revert Timelock::queueTransaction: Estimated execution block must satisfy delay.'
      );
    });

    it('sets hash as true in queuedTransactions mapping', async () => {
      const queueTransactionsHashValueBefore = await call(timelock, 'queuedTransactions', [queuedTxHash]);
      assert.equal(queueTransactionsHashValueBefore, false);

      await send(timelock, 'queueTransaction', [target, value, signature, data, eta], { from: root });

      const queueTransactionsHashValueAfter = await call(timelock, 'queuedTransactions', [queuedTxHash]);
      assert.equal(queueTransactionsHashValueAfter, true);
    });

    it('should emit QueueTransaction event', async () => {
      const result = await send(timelock, 'queueTransaction', [target, value, signature, data, eta], {
        from: root
      });

      assert.hasLog(result, 'QueueTransaction', {
        data,
        signature,
        target,
        eta: eta.toString(),
        txHash: queuedTxHash,
        value: value.toString()
      });
    });
  });

  describe('cancelTransaction', async () => {
    before(async () => {
      await send(timelock, 'queueTransaction', [target, value, signature, data, eta], {
        from: root
      });
    });

    it('requires admin to be msg.sender', async () => {
      await assert.revert(
        send(timelock, 'cancelTransaction', [target, value, signature, data, eta], { from: notAdmin }),
        'revert Timelock::cancelTransaction: Call must come from admin.'
      );
    });

    it('sets hash from true to false in queuedTransactions mapping', async () => {
      const queueTransactionsHashValueBefore = await call(timelock, 'queuedTransactions', [queuedTxHash]);
      assert.equal(queueTransactionsHashValueBefore, true);

      await send(timelock, 'cancelTransaction', [target, value, signature, data, eta], { from: root });

      const queueTransactionsHashValueAfter = await call(timelock, 'queuedTransactions', [queuedTxHash]);
      assert.equal(queueTransactionsHashValueAfter, false);
    });

    it('should emit CancelTransaction event', async () => {
      const result = await send(timelock, 'cancelTransaction', [target, value, signature, data, eta], {
        from: root
      });

      assert.hasLog(result, 'CancelTransaction', {
        data,
        signature,
        target,
        eta: eta.toString(),
        txHash: queuedTxHash,
        value: value.toString()
      });
    });
  });

  describe('executeTransaction (setDelay)', async () => {
    before(async () => {
      // Queue transaction that will succeed
      await send(timelock, 'queueTransaction', [target, value, signature, data, eta], {
        from: root
      });

      // Queue transaction that will revert when executed
      await send(timelock, 'queueTransaction', [target, value, signature, revertData, eta], {
        from: root
      });
    });

    it('requires admin to be msg.sender', async () => {
      await assert.revert(
        send(timelock, 'executeTransaction', [target, value, signature, data, eta], { from: notAdmin }),
        'revert Timelock::executeTransaction: Call must come from admin.'
      );
    });

    it('requires transaction to be queued', async () => {
      const differentEta = eta.add(1);
      await assert.revert(
        send(timelock, 'executeTransaction', [target, value, signature, data, differentEta], { from: root }),
        "revert Timelock::executeTransaction: Transaction hasn't been queued."
      );
    });

    it('requires timestamp to be greater than or equal to eta', async () => {
      await assert.revert(
        send(timelock, 'executeTransaction', [target, value, signature, data, eta], {
          from: root
        }),
        "revert Timelock::executeTransaction: Transaction hasn't surpassed time lock."
      );
    });

    it('requires timestamp to be less than eta plus gracePeriod', async () => {
      const blockFastForward = delay.add(gracePeriod).add(1);
      await send(timelock, 'harnessFastForward', [blockFastForward]);

      await assert.revert(
        send(timelock, 'executeTransaction', [target, value, signature, data, eta], {
          from: root
        }),
        'revert Timelock::executeTransaction: Transaction is stale.'
      );
    });

    it('requires target.call transaction to succeed', async () => {
      const newBlockTimestamp = blockTimestamp.add(delay).add(1);
      await send(timelock, 'harnessSetBlockTimestamp', [newBlockTimestamp]);

      await assert.revert(
        send(timelock, 'executeTransaction', [target, value, signature, revertData, eta], {
          from: root
        }),
        'revert Timelock::executeTransaction: Transaction execution reverted.'
      );
    });

    it('sets hash from true to false in queuedTransactions mapping, updates delay, and emits ExecuteTransaction event', async () => {
      const configuredDelayBefore = await call(timelock, 'delay');
      assert.equal(configuredDelayBefore, delay.toString());

      const queueTransactionsHashValueBefore = await call(timelock, 'queuedTransactions', [queuedTxHash]);
      assert.equal(queueTransactionsHashValueBefore, true);

      const newBlockTimestamp = blockTimestamp.add(delay).add(1);
      await send(timelock, 'harnessSetBlockTimestamp', [newBlockTimestamp]);

      const result = await send(timelock, 'executeTransaction', [target, value, signature, data, eta], {
        from: root
      });

      const queueTransactionsHashValueAfter = await call(timelock, 'queuedTransactions', [queuedTxHash]);
      assert.equal(queueTransactionsHashValueAfter, false);

      const configuredDelayAfter = await call(timelock, 'delay');
      assert.equal(configuredDelayAfter, newDelay.toString());

      assert.hasLog(result, 'ExecuteTransaction', {
        data,
        signature,
        target,
        eta: eta.toString(),
        txHash: queuedTxHash,
        value: value.toString()
      });
    });
  });

  describe('executeTransaction (setAdmin)', async () => {
    before(async () => {
      const configuredDelay = await call(timelock, 'delay');

      delay = bigNumberify(configuredDelay);
      signature = 'setAdmin(address)';
      data = encodeParameters(['address'], [newAdmin]);
      eta = blockTimestamp.add(delay);

      queuedTxHash = keccak256(
        encodeParameters(
          ['address', 'uint256', 'string', 'bytes', 'uint256'],
          [target, value, signature, data, eta]
        )
      );

      await send(timelock, 'harnessSetBlockTimestamp', [blockTimestamp]);
      await send(timelock, 'queueTransaction', [target, value, signature, data, eta], {
        from: root
      });
    });

    it('requires admin to be msg.sender', async () => {
      await assert.revert(
        send(timelock, 'executeTransaction', [target, value, signature, data, eta], { from: notAdmin }),
        'revert Timelock::executeTransaction: Call must come from admin.'
      );
    });

    it('requires transaction to be queued', async () => {
      const differentEta = eta.add(1);
      await assert.revert(
        send(timelock, 'executeTransaction', [target, value, signature, data, differentEta], { from: root }),
        "revert Timelock::executeTransaction: Transaction hasn't been queued."
      );
    });

    it('requires timestamp to be greater than or equal to eta', async () => {
      await assert.revert(
        send(timelock, 'executeTransaction', [target, value, signature, data, eta], {
          from: root
        }),
        "revert Timelock::executeTransaction: Transaction hasn't surpassed time lock."
      );
    });

    it('requires timestamp to be less than eta plus gracePeriod', async () => {
      const blockFastForward = delay.add(gracePeriod).add(1);
      await send(timelock, 'harnessFastForward', [blockFastForward]);

      await assert.revert(
        send(timelock, 'executeTransaction', [target, value, signature, data, eta], {
          from: root
        }),
        'revert Timelock::executeTransaction: Transaction is stale.'
      );
    });

    it('sets hash from true to false in queuedTransactions mapping, updates admin, and emits ExecuteTransaction event', async () => {
      const configuredAdminBefore = await call(timelock, 'admin');
      assert.equal(configuredAdminBefore, root);

      const queueTransactionsHashValueBefore = await call(timelock, 'queuedTransactions', [queuedTxHash]);
      assert.equal(queueTransactionsHashValueBefore, true);

      const newBlockTimestamp = blockTimestamp.add(delay).add(1);
      await send(timelock, 'harnessSetBlockTimestamp', [newBlockTimestamp]);

      const result = await send(timelock, 'executeTransaction', [target, value, signature, data, eta], {
        from: root
      });

      const queueTransactionsHashValueAfter = await call(timelock, 'queuedTransactions', [queuedTxHash]);
      assert.equal(queueTransactionsHashValueAfter, false);

      const configuredAdminAfter = await call(timelock, 'admin');
      assert.equal(configuredAdminAfter, newAdmin);

      assert.hasLog(result, 'ExecuteTransaction', {
        data,
        signature,
        target,
        eta: eta.toString(),
        txHash: queuedTxHash,
        value: value.toString()
      });
    });
  });
});
