const {
  address,
  etherMantissa,
  getContract,
  getTestContract,
  call,
  send
} = require('../Utils/MochaTruffle');

const {
  makeComptroller,
  makePriceOracle
} = require('../Utils/Compound');

const Unitroller = getContract('Unitroller');
const ComptrollerG1 = getContract('ComptrollerG1');
const EchoTypesComptroller = getTestContract('EchoTypesComptroller');

contract('Unitroller', function([root, ...accounts]) {
  let unitroller;
  let brains;
  let oracle;
  before(async () => {
    oracle = await makePriceOracle();
    brains = await ComptrollerG1.deploy().send({ from: root });
  });

  beforeEach(async () => {
    unitroller = await Unitroller.deploy().send({from: root});
  });

  let setPending = (implementation, from) => {
    return send(unitroller, '_setPendingImplementation', [implementation._address], {from});
  };

  describe("constructor", async () => {
    it("sets admin to caller and addresses to 0", async () => {
      assert.equal(await call(unitroller, 'admin'), root);
      assert.addressZero(await call(unitroller, 'pendingAdmin'));
      assert.addressZero(await call(unitroller, 'pendingComptrollerImplementation'));
      assert.addressZero(await call(unitroller, 'comptrollerImplementation'));
    });
  });

  describe("_setPendingImplementation", async () => {
    describe("Check caller is admin", async () => {
      let result;
      before(async () => {
        result = await setPending(brains, accounts[1]);
      });

      it("emits a failure log", async () => {
        assert.hasTrollFailure(
          result,
          'UNAUTHORIZED',
          'SET_PENDING_IMPLEMENTATION_OWNER_CHECK'
        );
      });

      it("does not change pending implementation address", async () => {
        assert.addressZero(await call(unitroller, 'pendingComptrollerImplementation'))
      });
    });

    describe("succeeding", async () => {
      it("stores pendingComptrollerImplementation with value newPendingImplementation", async () => {
        await setPending(brains, root);
        assert.equal(await call(unitroller, 'pendingComptrollerImplementation'), brains._address);
      });

      it("emits NewPendingImplementation event", async () => {
        assert.hasLog(
          await send(unitroller, '_setPendingImplementation', [brains._address]),
          'NewPendingImplementation', {
            oldPendingImplementation: address(0),
            newPendingImplementation: brains._address
          });
      });
    });
  });

  describe("_acceptImplementation", async () => {
    describe("Check caller is pendingComptrollerImplementation  and pendingComptrollerImplementation ≠ address(0) ", async () => {
      let result;
      beforeEach(async () => {
        await setPending(unitroller, root);
        result = await send(unitroller, '_acceptImplementation');
      });

      it("emits a failure log", async () => {
        assert.hasTrollFailure(
          result,
          'UNAUTHORIZED',
          'ACCEPT_PENDING_IMPLEMENTATION_ADDRESS_CHECK'
        );
      });

      it("does not change current implementation address", async () => {
        assert.notEqual(await call(unitroller, 'comptrollerImplementation'), unitroller._address);
      });
    });

    it.skip("rejects if pending impl is address(0)", async () => {
      // XXX TODO?
    });

    describe("the brains must accept the responsibility of implementation", async () => {
      let result;
      beforeEach(async () => {
        await setPending(brains, root);
        result = await send(brains, '_become', [unitroller._address, oracle._address, etherMantissa(.051), 10, false]);
        assert.success(result);
      });

      it("Store comptrollerImplementation with value pendingComptrollerImplementation", async () => {
        assert.equal(await call(unitroller, 'comptrollerImplementation'), brains._address);
      });

      it("Unset pendingComptrollerImplementation", async () => {
        assert.addressZero(await call(unitroller, 'pendingComptrollerImplementation'));
      });

      it.skip("Emit NewImplementation(oldImplementation, newImplementation)", async () => {
        // TODO:
        // Does our log decoder expect it to come from the same contract?
        // assert.hasLog(
        //   result,
        //   "NewImplementation",
        //   {
        //     newImplementation: brains._address,
        //     oldImplementation: "0x0000000000000000000000000000000000000000"
        //   });
      });

      it.skip("Emit NewPendingImplementation(oldPendingImplementation, 0)", async () => {
        // TODO:
        // Does our log decoder expect it to come from the same contract?
        // Having difficulty decoding these events
        // assert.hasLog(
        //   result,
        //   "NewPendingImplementation",
        //   {
        //     oldPendingImplementation: brains._address,
        //     newPendingImplementation: "0x0000000000000000000000000000000000000000"
        //   });
      });
    });

    describe("fallback delegates to brains", async () => {
      let troll;
      before(async () => {
        troll = await EchoTypesComptroller.deploy().send({from: root});
        unitroller = await Unitroller.deploy().send({from: root});
        await setPending(troll, root);
        await send(troll, 'becomeBrains', [unitroller._address]);
        troll.options.address = unitroller._address;
      });

      it("forwards reverts", async () => {
        await assert.revert(call(troll, 'reverty'), "revert gotcha sucka");
      });

      it("gets addresses", async () => {
        assert.equal(await call(troll, 'addresses', [troll._address]), troll._address);
      });

      it("gets strings", async () => {
        assert.equal(await call(troll, 'stringy', ["yeet"]), "yeet");
      });

      it("gets bools", async () => {
        assert.equal(await call(troll, 'booly', [true]), true);
      });

      it("gets list of ints", async () => {
        assert.deepEqual(await call(troll, 'listOInts', [[1,2,3]]), ["1", "2", "3"]);
      });
    });
  });
});
