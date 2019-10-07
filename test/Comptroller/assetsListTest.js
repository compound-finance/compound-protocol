const {both, call, send} = require('../Utils/MochaTruffle');
const {
  makeComptroller,
  makeCToken
} = require('../Utils/Compound');

contract('assetListTest', function([root, customer, ...accounts]) {
  let comptroller;
  let allTokens, OMG, ZRX, BAT, REP, DAI, SKT;

  beforeEach(async () => {
    comptroller = await makeComptroller({maxAssets: 10});
    allTokens = [OMG, ZRX, BAT, REP, DAI, SKT] = await Promise.all(
      ['OMG', 'ZRX', 'BAT', 'REP', 'DAI', 'sketch']
        .map(async (name) => makeCToken({comptroller, name, symbol: name, supportMarket: name != 'sketch', underlyingPrice: 0.5}))
    );
  });

  describe('_setMaxAssets', async () => {
    it("fails if called by a non-admin", async () => {
      assert.hasTrollFailure(
        await send(comptroller, '_setMaxAssets', [15], {from: customer}),
        'UNAUTHORIZED',
        'SET_MAX_ASSETS_OWNER_CHECK'
      );
      assert.equal(await call(comptroller, 'maxAssets'), 10);
    });

    it("succeeds if called by an admin", async() => {
      assert.hasLog(
        await send(comptroller, '_setMaxAssets', [15]),
        'NewMaxAssets', {
          oldMaxAssets: "10",
          newMaxAssets: "15"
        });
      assert.equal(await call(comptroller, 'maxAssets'), 15);
    });
  });

  async function checkMarkets(expectedTokens) {
    for (let token of allTokens) {
      const isExpected = expectedTokens.some(e => e.symbol == token.symbol);
      assert.equal(await call(comptroller, 'checkMembership', [customer, token._address]), isExpected, `expected ${token.symbol} ${isExpected}`);
    }
  }

  async function enterAndCheckMarkets(enterTokens, expectedTokens, expectedErrors = null) {
    const {reply, receipt} = await both(comptroller, 'enterMarkets', [enterTokens.map(t => t._address)], {from: customer});
    const assetsIn = await call(comptroller, 'getAssetsIn', [customer]);
    assert.each('hasTrollError', reply, expectedErrors || enterTokens.map(_ => 'NO_ERROR'));
    assert.trollSuccess(receipt);
    assert.deepEqual(assetsIn, expectedTokens.map(t => t._address), 'should match expected markets');
    await checkMarkets(expectedTokens);
    return receipt;
  };

  async function exitAndCheckMarkets(exitToken, expectedTokens, expectedError = 'NO_ERROR') {
    const {reply, receipt} = await both(comptroller, 'exitMarket', [exitToken._address], {from: customer});
    const assetsIn = await call(comptroller, 'getAssetsIn', [customer]);
    assert.hasTrollError(reply, expectedError);
    //assert.trollSuccess(receipt); XXX enterMarkets cannot fail, but exitMarket can - kind of confusing
    assert.deepEqual(assetsIn, expectedTokens.map(t => t._address), 'should match expected markets');
    await checkMarkets(expectedTokens);
    return receipt;
  };

  describe('enterMarkets', async () => {
    it("properly emits events", async () => {
      const result1 = await enterAndCheckMarkets([OMG], [OMG]);
      const result2 = await enterAndCheckMarkets([OMG], [OMG]);
      assert.hasLog(
        result1,
        'MarketEntered', {
          cToken: OMG._address,
          account: customer
        });
      assert.deepEqual(result2.events, {}, "should have no events");
    });

    it("adds to the asset list only once", async () => {
      await enterAndCheckMarkets([OMG], [OMG]);
      await enterAndCheckMarkets([OMG], [OMG]);
      await enterAndCheckMarkets([ZRX, BAT, OMG], [OMG, ZRX, BAT]);
      await enterAndCheckMarkets([ZRX, OMG], [OMG, ZRX, BAT]);
      await enterAndCheckMarkets([ZRX], [OMG, ZRX, BAT]);
      await enterAndCheckMarkets([OMG], [OMG, ZRX, BAT]);
      await enterAndCheckMarkets([ZRX], [OMG, ZRX, BAT]);
      await enterAndCheckMarkets([BAT], [OMG, ZRX, BAT]);
    });

    it("the market must be listed for add to succeed", async () => {
      await enterAndCheckMarkets([SKT], [], ['MARKET_NOT_LISTED']);
      await send(comptroller, '_supportMarket', [SKT._address]);
      await enterAndCheckMarkets([SKT], [SKT]);
    });

    it("returns a list of codes mapping to user's ultimate membership in given addresses", async () => {
      await enterAndCheckMarkets([OMG, ZRX, BAT], [OMG, ZRX, BAT], ['NO_ERROR', 'NO_ERROR', 'NO_ERROR'], "success if can enter markets");
      await enterAndCheckMarkets([OMG, SKT], [OMG, ZRX, BAT], ['NO_ERROR', 'MARKET_NOT_LISTED'], "error for unlisted markets");
    });

    it("can enter one + asset cap reached", async () => {
      await send(comptroller, '_setMaxAssets', [1]);
      await enterAndCheckMarkets([ZRX, OMG], [ZRX], ['NO_ERROR', 'TOO_MANY_ASSETS'], "error if asset cap reached");
    });

    it("reaches asset cap + already in asset", async () => {
      await send(comptroller, '_setMaxAssets', [1]);
      await enterAndCheckMarkets([ZRX], [ZRX]);
      await enterAndCheckMarkets([OMG, ZRX], [ZRX], ['TOO_MANY_ASSETS', 'NO_ERROR'], "error if already in asset");
    });

    describe('reaching the asset cap', async () => {
      beforeEach(async () => {
        await send(comptroller, '_setMaxAssets', [3]);
        await enterAndCheckMarkets([OMG, ZRX, BAT], [OMG, ZRX, BAT]);
      });

      it("does not grow if user exactly at asset cap", async () => {
        await send(comptroller, '_setMaxAssets', [3]);
        await enterAndCheckMarkets([REP], [OMG, ZRX, BAT], ['TOO_MANY_ASSETS']);
        await send(comptroller, '_setMaxAssets', [4]);
        await enterAndCheckMarkets([REP], [OMG, ZRX, BAT, REP]);
        await enterAndCheckMarkets([DAI], [OMG, ZRX, BAT, REP], ['TOO_MANY_ASSETS']);
      });

      it("does not grow if user is well beyond asset cap", async () => {
        await send(comptroller, '_setMaxAssets', [1]);
        await enterAndCheckMarkets([REP], [OMG, ZRX, BAT], ['TOO_MANY_ASSETS']);
      });
    });
  });

  describe('exitMarket', async () => {
    it("doesn't let you exit if you have a borrow balance", async () => {
      await enterAndCheckMarkets([OMG], [OMG]);
      await send(OMG, 'harnessSetAccountBorrows', [customer, 1, 1]);
      await exitAndCheckMarkets(OMG, [OMG], 'NONZERO_BORROW_BALANCE');
    });

    it("rejects unless redeem allowed", async () => {
      await enterAndCheckMarkets([OMG, BAT], [OMG, BAT]);
      await send(BAT, 'harnessSetAccountBorrows', [customer, 1, 1]);

      // BAT has a negative balance and there's no supply, thus account should be underwater
      await exitAndCheckMarkets(OMG, [OMG, BAT], 'REJECTION');
    });

    it("accepts when you're not in the market already", async () => {
      await enterAndCheckMarkets([OMG, BAT], [OMG, BAT]);

      // Not in ZRX, should exit fine
      await exitAndCheckMarkets(ZRX, [OMG, BAT], 'NO_ERROR');
    });

    it("properly removes when there's only one asset", async () => {
      await enterAndCheckMarkets([OMG], [OMG]);
      await exitAndCheckMarkets(OMG, [], 'NO_ERROR');
    });

    it("properly removes when there's only two assets, removing the first", async () => {
      await enterAndCheckMarkets([OMG, BAT], [OMG, BAT]);
      await exitAndCheckMarkets(OMG, [BAT], 'NO_ERROR');
    });

    it("properly removes when there's only two assets, removing the second", async () => {
      await enterAndCheckMarkets([OMG, BAT], [OMG, BAT]);
      await exitAndCheckMarkets(BAT, [OMG], 'NO_ERROR');
    });

    it("properly removes when there's only three assets, removing the first", async () => {
      await enterAndCheckMarkets([OMG, BAT, ZRX], [OMG, BAT, ZRX]);
      await exitAndCheckMarkets(OMG, [ZRX, BAT], 'NO_ERROR');
    });

    it("properly removes when there's only three assets, removing the second", async () => {
      await enterAndCheckMarkets([OMG, BAT, ZRX], [OMG, BAT, ZRX]);
      await exitAndCheckMarkets(BAT, [OMG, ZRX], 'NO_ERROR');
    });

    it("properly removes when there's only three assets, removing the third", async () => {
      await enterAndCheckMarkets([OMG, BAT, ZRX], [OMG, BAT, ZRX]);
      await exitAndCheckMarkets(ZRX, [OMG, BAT], 'NO_ERROR');
    });
  });

  describe('entering from borrowAllowed', async () => {
    it("enters when called by a ctoken", async () => {
      await send(BAT, 'harnessCallBorrowAllowed', [1], {from: customer});

      const assetsIn = await call(comptroller, 'getAssetsIn', [customer]);

      assert.deepEqual([BAT._address], assetsIn);

      await checkMarkets([BAT]);
    });

    it("does not enter when called by not a ctoken", async () => {
      await send(comptroller, 'borrowAllowed', [BAT._address, customer, 1], {from: customer});

      const assetsIn = await call(comptroller, 'getAssetsIn', [customer]);

      assert.deepEqual([], assetsIn);

      await checkMarkets([]);
    });

    it("adds to the asset list only once", async () => {
      await send(comptroller, 'borrowAllowed', [BAT._address, customer, 1], {from: customer});

      await enterAndCheckMarkets([BAT], [BAT]);

      await send(comptroller, 'borrowAllowed', [BAT._address, customer, 1], {from: customer});
      const assetsIn = await call(comptroller, 'getAssetsIn', [customer]);
      assert.deepEqual([BAT._address], assetsIn);
    });
  });
});
