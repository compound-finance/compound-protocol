const { address, both, call, etherMantissa, send } = require('../Utils/MochaTruffle');

const { makeComptroller, makePriceOracle, makeCToken, makeToken } = require('../Utils/Compound');

contract('Comptroller', ([root, ...accounts]) => {
  let comptroller;

  describe("_setPauseGuardian", async () => {
    before(async () => {
      comptroller = await makeComptroller();
    });

    describe("failing", async () => {
      it("emits a failure log if not sent by admin", async () => {
        let result = await send(comptroller, '_setPauseGuardian', [root], {from: accounts[1]});
        assert.hasTrollFailure(
          result,
          'UNAUTHORIZED',
          'SET_PAUSE_GUARDIAN_OWNER_CHECK'
        );
      });

      it("does not change the pause guardian", async () => {
        let pauseGuardian = await call(comptroller, 'pauseGuardian');
        assert.equal(pauseGuardian, address(0));
        await send(comptroller, '_setPauseGuardian', [root], {from: accounts[1]});

        pauseGuardian = await call(comptroller, 'pauseGuardian');
        assert.equal(pauseGuardian, address(0));
      });
    });


    describe('succesfully changing pause guardian', async () => {
      let result;

      beforeEach(async () => {
        comptroller = await makeComptroller();

        result = await send(comptroller, '_setPauseGuardian', [accounts[1]]);
      });

      it('emits new pause guardian event', async () => {
        assert.hasLog(result, 'NewPauseGuardian', {newPauseGuardian: accounts[1], oldPauseGuardian: address(0)});
      });

      it('changes pending pause guardian', async () => {
        let pauseGuardian = await call(comptroller, 'pauseGuardian');
        assert.equal(pauseGuardian, accounts[1]);
      });
    });
  });

  describe('setting paused', async () => {
    before(async () => {
      comptroller = await makeComptroller();
    });

    let methods = ["Borrow", "Mint", "Transfer", "Seize"];
    describe('succeeding', async() => {
      let pauseGuardian;
      before(async () => {
        pauseGuardian = accounts[1];
        await send(comptroller, '_setPauseGuardian', [accounts[1]], {from: root});
      });

      methods.forEach(async (method) => {
        it(`only pause guardian or admin can pause ${method}`, async () => {
          await assert.revert(send(comptroller, `_set${method}Paused`, [true], {from: accounts[2]}), "revert only pause guardian and admin can pause");
          await assert.revert(send(comptroller, `_set${method}Paused`, [false], {from: accounts[2]}), "revert only pause guardian and admin can pause");
        });

        it(`PauseGuardian can pause of ${method}GuardianPaused`, async () => {
          result = await send(comptroller, `_set${method}Paused`, [true], {from: pauseGuardian});
          assert.hasLog(result, `ActionPaused`, {action: method, pauseState: true});

          let camelCase = method.charAt(0).toLowerCase() + method.substring(1);

          state = await call(comptroller, `${camelCase}GuardianPaused`);
          assert.equal(state, true);

          await assert.revert(send(comptroller, `_set${method}Paused`, [false], {from: pauseGuardian}), "revert only admin can unpause");
          result = await send(comptroller, `_set${method}Paused`, [false]);

          assert.hasLog(result, `ActionPaused`, {action: method, pauseState: false});

          state = await call(comptroller, `${camelCase}GuardianPaused`);
          assert.equal(state, false);
        });

        it(`pauses ${method}`, async() => {
          await send(comptroller, `_set${method}Paused`, [true], {from: pauseGuardian});

          let camelCase = method.charAt(0).toLowerCase() + method.substring(1);
          switch (method) {
          case "Mint":
            await assert.revert(send(comptroller, `${camelCase}Allowed`, [address(1), address(2), 1]), `revert ${method.toLowerCase()} is paused`);
            break;

          case "Borrow":
            await assert.revert(send(comptroller, `${camelCase}Allowed`, [address(1), address(2), 1]), `revert ${method.toLowerCase()} is paused`);
            break;

          case "Transfer":
            await assert.revert(send(comptroller, `${camelCase}Allowed`, [address(1), address(2), address(3), 1]), `revert ${method.toLowerCase()} is paused`);
            break;

          case "Seize":
            await assert.revert(send(comptroller, `${camelCase}Allowed`, [address(1), address(2), address(3), address(4), 1]), `revert ${method.toLowerCase()} is paused`);
            break;

          default:
            break;
          }
        });
      });
    });
  });
});
