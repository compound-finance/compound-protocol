const {
  address,
  both,
  call,
  etherMantissa,
  send
} = require('../Utils/MochaTruffle');

const {
  makeComptroller,
  makePriceOracle,
  makeCToken,
  makeToken
} = require('../Utils/Compound');

contract('Comptroller', ([root, ...accounts]) => {
  let comptroller;

  describe("_acceptPauseGuardian", async () => {
    beforeEach(async () => {
      comptroller = await makeComptroller();
      await send(comptroller, '_setPendingPauseGuardian', [accounts[3]]);
    });

    describe("succeeding", async () => {
      it("emits a logs", async () => {
        let result = await send(comptroller, '_acceptPauseGuardian', [], {from: accounts[3]});
        assert.hasLog(result, 'NewPendingPauseGuardian', {newPendingPauseGuardian: address(0), oldPendingPauseGuardian: accounts[3]});
        assert.hasLog(result, 'NewPauseGuardian', {oldPauseGuardian: address(0), newPauseGuardian: accounts[3]});
      });

      it("changes pause guardian address", async () => {
        let result = await send(comptroller, '_acceptPauseGuardian', [], {from: accounts[3]});
        let pg = await call(comptroller, 'pauseGuardian');
        let ppg = await call(comptroller, 'pendingPauseGuardian');
        assert.equal(accounts[3], pg);
        assert.equal(address(0), ppg);
      });
    });

    describe("failing", async () => {
      let result;
      before(async () => {
        result = await send(comptroller, '_acceptPauseGuardian', [], {from: accounts[4]});
      });

      it("emits a log", async () => {
        assert.hasTrollFailure(
          result,
          'UNAUTHORIZED',
          'ACCEPT_PAUSE_GUARDIAN_OWNER_CHECK'
        );
      });

      it("does not change pause guardian address", async () => {
        let pg = await call(comptroller, 'pauseGuardian');
        let ppg = await call(comptroller, 'pendingPauseGuardian');
        assert.equal(address(0), pg);
        assert.equal(accounts[3], ppg);
      });
    });
  });

  describe("_setPendingPauseGuardian", async () => {
    before(async () => {
      comptroller = await makeComptroller();
    });

    describe("Check caller is admin or pause guardian", async () => {

      it("emits a failure log", async () => {
        let result = await send(comptroller, '_setPendingPauseGuardian', [root], {from: accounts[1]});
        assert.hasTrollFailure(
          result,
          'UNAUTHORIZED',
          'SET_PENDING_PAUSE_GUARDIAN_OWNER_CHECK'
        );
      });

      it("does not change pending implementation address", async () => {
        await send(comptroller, '_setPendingPauseGuardian', [root], {from: accounts[1]});
        assert.addressZero(await call(comptroller, 'pendingPauseGuardian'));
      });
    });


    ["pauseGuardian", "admin"].forEach(async (adminType) => {
      describe(`succesfully changing pending pause guardian as ${adminType}`, async () => {
        let result;
        let oldPendingPauseGuardian;
        let admin;

        beforeEach(async () => {
          comptroller = await makeComptroller();
          switch ( adminType ) {
          case "pauseGuardian":
            admin = accounts[2];
            await send(comptroller, 'setPauseGuardian', [ admin ]);
            break;
          case "admin":
            admin = root;
            break;
          }


          oldPendingPauseGuardian = await call(comptroller, 'pendingPauseGuardian');
          result = await send(comptroller, '_setPendingPauseGuardian', [accounts[1]], {from: admin});
        });

        it('emits new pending pause guardian event', async () => {
          assert.hasLog(result, 'NewPendingPauseGuardian', {newPendingPauseGuardian: accounts[1], oldPendingPauseGuardian: oldPendingPauseGuardian});
        });

        it('changes pending pause guardian', async () => {
          let pendingPauseGuardian = await call(comptroller, 'pendingPauseGuardian');
          assert.equal(pendingPauseGuardian, accounts[1]);
        });
      });
    });
  });

  describe('setting paused', async() => {
    before(async () => {
      comptroller = await makeComptroller();
    });

    let methods = ["Borrow", "Mint", "Transfer", "LiquidateBorrow"];
    describe('succeeding', async() => {
      let pauseGuardian;
      before(async() => {
        pauseGuardian = accounts[1];
        await send(comptroller, '_setPendingPauseGuardian', [pauseGuardian], {from: root});
        await send(comptroller, '_acceptPauseGuardian', [], {from: pauseGuardian});
      });

      methods.forEach(async (method) => {
        it(`PauseGuardian can change value of ${method}GuardianPaused`, async () => {
          result = await send(comptroller, `_set${method}Paused`, [true], {from: pauseGuardian});
          assert.hasLog(result, `ActionPaused`, {action: method, pauseState: true});

          let camelCase = method.charAt(0).toLowerCase() + method.substring(1);

          state = await call(comptroller, `${camelCase}GuardianPaused`);
          assert.equal(state, true);


          result = await send(comptroller, `_set${method}Paused`, [false], {from: pauseGuardian});
          assert.hasLog(result, `ActionPaused`, {action: method, pauseState: false});

          state = await call(comptroller, `${camelCase}GuardianPaused`);
          assert.equal(state, false);
        });
      });
    });
  });
});
