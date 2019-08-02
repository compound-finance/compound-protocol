const BigNumber = require('bignumber.js');

const {
  address,
  etherMantissa,
  getContract,
  call,
  send
} = require('./Utils/MochaTruffle');

const {
  makeToken,
  makePriceOracle
} = require('./Utils/Compound');

const gas = {
  call: 700,             // G_call
  storage_read: 200,     // G_sload
  storage_new: 20000,    // G_sset
  storage_update: 5000,  // G_sreset
  transaction: 21000,    // G_transaction
};

async function validateGas(tx, expected, delta, excludeTrxFee=false, reason="should cost expected gas") {
  assert.approximately(tx.gasUsed, expected + (excludeTrxFee ? 0 : gas.transaction), delta, reason);
}

async function setMaxSwing(oracle, maxSwing, poster) {
  return send(oracle, 'harnessSetMaxSwing', [etherMantissa(maxSwing)], {from: poster});
}

async function calculateSwing(oracle, anchor, price) {
  return call(oracle, 'harnessCalculateSwing', [etherMantissa(anchor), etherMantissa(price)]);
}

async function capToMax(oracle, anchor, price, poster) {
  return call(oracle, 'harnessCapToMax', [etherMantissa(anchor), etherMantissa(price)], {from: poster});
}

async function setPrice(oracle, asset, price, poster) {
  return send(oracle, 'setPrice', [asset._address, etherMantissa(price)], {from: poster});
}

async function setPrices(oracle, assets, prices, poster) {
  return send(oracle, 'setPrices', [assets.map(a => a._address), prices.map(etherMantissa)], {from: poster});
}

async function getPrice(oracle, asset) {
  return call(oracle, 'getPrice', [asset._address]);
}

async function setAnchor(oracle, asset, price, period, admin) {
  return send(oracle, 'harnessSetAnchor', [asset._address, etherMantissa(price), period], admin && {from: admin});
}

async function getAnchor(oracle, asset) {
  return call(oracle, 'anchors', [asset._address]);
}

async function getAnchorPrice(oracle, asset) {
  return (await getAnchor(oracle, asset)).priceMantissa;
}

async function setPendingAnchorAdmin(oracle, newAdmin, oldAdmin) {
  return send(oracle, '_setPendingAnchorAdmin', [newAdmin], oldAdmin && {from: oldAdmin});
}

async function setPendingAnchorPrice(oracle, asset, price, admin) {
  return send(oracle, '_setPendingAnchor', [asset._address, etherMantissa(price)], {from: admin});
}

async function getPendingAnchorPrice(oracle, asset) {
  return call(oracle, 'pendingAnchors', [asset._address]);
}

async function validatePriceAndAnchors(oracle, asset, expectedPrice, expectedAnchor, expectedPendingAnchor = 0) {
  assert.numEqual(await getPrice(oracle, asset), etherMantissa(expectedPrice), "money market price");
  assert.numEqual(await getAnchorPrice(oracle, asset), etherMantissa(expectedAnchor), "oracle anchor price");
  assert.numEqual(await getPendingAnchorPrice(oracle, asset), etherMantissa(expectedPendingAnchor), "pending anchor");
}

async function setPriceAndValidate(oracle, asset, price, poster, capped = false) {
  const result = await setPrice(oracle, asset, price, poster);
  assert.oracleSuccess(result);
  if (capped !== false) {
    assert.hasLog(result, 'PricePosted', {
      asset: asset._address,
      requestedPriceMantissa: etherMantissa(price).toString(),
      newPriceMantissa: etherMantissa(capped).toString()
    });
    assert.hasLog(result, 'CappedPricePosted', {
      asset: asset._address,
      requestedPriceMantissa: etherMantissa(price).toString(),
      cappedPriceMantissa: etherMantissa(capped).toString()
    });
  } else {
    assert.hasLog(result, 'PricePosted', {
      asset: asset._address,
      requestedPriceMantissa: etherMantissa(price).toString(),
      newPriceMantissa: etherMantissa(price).toString()
    });
    assert.hasNoLog(result, 'CappedPricePosted');
  }
}

contract('PriceOracle', function([root, admin, poster, ...accounts]) {
  async function setupPriceTest(numAssets = 0) {
    const oracle = await makePriceOracle({kind: 'anchor', poster});
    const assets = await Promise.all(Array(numAssets).fill().map((_, i) => makeToken({symbol: `OMG${i}`})));
    const prices = Array(numAssets).fill().map((_, i) => ((i + 1) * 0.1));
    return {oracle, assets, prices};
  }

  describe.skip("gas tests", () => {
    // Note: these gas estimates don't seem accurate, but keeping them ported for future work
    it('getPrice costs the expected amount of gas', async () => {
      const {oracle, assets, prices} = await setupPriceTest(2);
      const A = await setPrices(oracle, assets, prices, poster);
      const B = await send(oracle, 'getPrice', [assets[0]._address]);
      const C = await send(oracle, 'getPrice', [assets[1]._address]);
      const expectedGas = 2 * gas.storage_read + 3000;
      await validateGas(B, expectedGas, 1000);
      await validateGas(C, expectedGas, 1000);
    });

    it("setPrice (non-initial) costs the expected amount of gas", async () => {
      const {oracle, assets} = await setupPriceTest(1);
      const A = await setPrice(oracle, assets[0], 0.5, poster);
      const B = await setPrice(oracle, assets[0], 0.55, poster);
      const otherOps = 7583; // total from opcodes not already estimated as gas.transaction, gas.storage_new, gas.storage_read, or gas.call
      const unknownGas = 5000;
      const expectedGas = unknownGas + otherOps + gas.transaction + gas.storage_update + (7 * gas.storage_read);
      await validateGas(B, expectedGas, 5000, true);
    });

    [{numAssets:  2, otherOps: 10340, unknownGas: 1000},
     {numAssets:  5, otherOps: 44368, unknownGas: 6000},
     {numAssets: 10, otherOps: 87653, unknownGas: 11000}].forEach(
       ({numAssets, otherOps, unknownGas}) => {
         it(`setPrices (${numAssets}, non-initial) costs the expected amount of gas`, async () => {
           const {oracle, assets, prices} = await setupPriceTest(numAssets);
           const newPrices = prices.map(p => p * 1.02);
           const A = await setPrices(oracle, assets, prices, poster);
           const B = await setPrices(oracle, assets, newPrices, poster);
           const expectedGas = unknownGas + gas.transaction + gas.storage_read + otherOps + (numAssets * (gas.storage_update + (7 * gas.storage_read)));
           await validateGas(B, expectedGas, 1000, true);
         });
       });
  });

  describe("capToMax", async () => {
    let oracle; before(async () => ({oracle} = await setupPriceTest(1)));

    async function capToMaxAndInRange(anchor, price) {
      const result = await capToMax(oracle, anchor, price, poster);
      assert.hasMathErrorTuple(result, ['NO_ERROR', false, etherMantissa(price)]);
    }

    async function capToMaxAndOutOfRange(anchor, price, capped) {
      const result = await capToMax(oracle, anchor, price, poster);
      assert.hasMathErrorTuple(result, ['NO_ERROR', true, etherMantissa(capped)]);
    }

    async function capToMaxAndError(anchor, price, error) {
      const result = await capToMax(oracle, anchor, price, poster);
      assert.hasMathErrorTuple(result, [error, false, 0]);
    }

    it("returns in range values as-is", async () => {
      await capToMaxAndInRange(10, 9);
      await capToMaxAndInRange(10, 10);
      await capToMaxAndInRange(10, 11);
    });

    it("caps an out of range price to the appropriate max or min value", async () => {
      await capToMaxAndOutOfRange(10, 0, 9);
      await capToMaxAndOutOfRange(10, 8, 9);
      await capToMaxAndOutOfRange(10, 12, 11);
      await capToMaxAndOutOfRange(10, 100, 11);
    });

    it("handles overflow on 1 plus maxSwing", async () => {
      await setMaxSwing(oracle, -1, poster);
      await capToMaxAndError(10, 10, 'INTEGER_OVERFLOW');
    });

    it("handles underflow on 1 minus maxSwing", async () => {
      await setMaxSwing(oracle, 2, poster);
      await capToMaxAndError(10, 10, 'INTEGER_UNDERFLOW');
    });

    it("handles overflow on calculating maxSwing", async () => {
      await setMaxSwing(oracle, 0.1, poster);
      await capToMaxAndError(-1, 10, 'INTEGER_OVERFLOW');
    });
  });

  describe("calculateSwing", async () => {
    let oracle, assets; before(async () => ({oracle, assets} = await setupPriceTest(1)));

    it("handles price equal anchor", async () => {
      const result = await calculateSwing(oracle, 10, 10);
      assert.hasMathErrorTuple(result, ['NO_ERROR', 0]);
    });

    it("handles price less than anchor", async () => {
      const result = await calculateSwing(oracle, 10, 8);
      assert.hasMathErrorTuple(result, ['NO_ERROR', etherMantissa(0.2)]);
    });

    it("handles price greater than anchor", async () => {
      const result = await calculateSwing(oracle, 10, 14);
      assert.hasMathErrorTuple(result, ['NO_ERROR', etherMantissa(0.4)]);
    });
  });

  describe("admin / _setPendingAnchor", async () => {
    let oracle, assets; before(async () => ({oracle, assets} = await setupPriceTest(1)));

    it("can be changed by anchor admin", async () => {
      assert.oracleSuccess(await setPendingAnchorPrice(oracle, assets[0], 0.3, root));
      assert.numEqual(await getPendingAnchorPrice(oracle, assets[0]), etherMantissa(0.3));
    });

    it("emits a log with non-zero previous value when changed", async () => {
      const result1 = await setPendingAnchorPrice(oracle, assets[0], 0.3, root);
      const result2 = await setPendingAnchorPrice(oracle, assets[0], 0.7, root)
      assert.oracleSuccess(result1);
      assert.oracleSuccess(result2);
      assert.hasLog(result2, 'NewPendingAnchor', {
        anchorAdmin: root,
        asset: assets[0]._address,
        oldScaledPrice: etherMantissa(0.3).toString(),
        newScaledPrice: etherMantissa(0.7).toString()
      });
    });

    it("can not be changed by non-anchor admin", async () => {
      assert.oracleSuccess(await setPendingAnchorPrice(oracle, assets[0], 0, root));
      assert.hasOracleFailure(
        await setPendingAnchorPrice(oracle, assets[0], 0.3, poster),
        'UNAUTHORIZED',
        'SET_PENDING_ANCHOR_PERMISSION_CHECK'
      );
      assert.numEqual(await getPendingAnchorPrice(oracle, assets[0]), 0);
    });
  });

  describe("admin / _setPendingAnchorAdmin", async () => {
    it("anchor admin is initially set to root and pendingAnchorAdmin is 0", async () => {
      const oracle = await makePriceOracle({kind: 'anchor', poster});
      assert.equal(await call(oracle, 'anchorAdmin'), root);
      assert.equal(await call(oracle, 'pendingAnchorAdmin'), address(0))
    });

    it("can be used by anchor admin", async () => {
      const oracle = await makePriceOracle({kind: 'anchor', poster});
      const result = await setPendingAnchorAdmin(oracle, admin, root);
      assert.oracleSuccess(result);
      assert.hasLog(result, 'NewPendingAnchorAdmin', {
        oldPendingAnchorAdmin: address(0),
        newPendingAnchorAdmin: admin
      });
      assert.equal(await call(oracle, 'anchorAdmin'), root);
      assert.equal(await call(oracle, 'pendingAnchorAdmin'), admin)
    });

    it("can be used to clear the pendingAnchorAdmin", async () => {
      const oracle = await makePriceOracle({kind: 'anchor', poster});
      assert.oracleSuccess(await setPendingAnchorAdmin(oracle, admin, root));
      assert.oracleSuccess(await setPendingAnchorAdmin(oracle, address(0), root));
      assert.equal(await call(oracle, 'anchorAdmin'), root);
      assert.equal(await call(oracle, 'pendingAnchorAdmin'), address(0))
    });

    it("fails if not called by admin", async () => {
      const oracle = await makePriceOracle({kind: 'anchor', poster});
      assert.hasOracleFailure(
        await setPendingAnchorAdmin(oracle, admin, poster),
        'UNAUTHORIZED',
        'SET_PENDING_ANCHOR_ADMIN_OWNER_CHECK'
      );
    });
  });

  describe("admin / _acceptAnchorAdmin", async () => {
    it("fails if not called by pendingAnchorAdmin", async () => {
      const oracle = await makePriceOracle({kind: 'anchor', poster});
      assert.oracleSuccess(await setPendingAnchorAdmin(oracle, admin, root));
      assert.hasOracleFailure(
        await send(oracle, '_acceptAnchorAdmin', [], {from: root}),
        'UNAUTHORIZED',
        'ACCEPT_ANCHOR_ADMIN_PENDING_ANCHOR_ADMIN_CHECK'
      );
      assert.equal(await call(oracle, 'anchorAdmin'), root);
      assert.equal(await call(oracle, 'pendingAnchorAdmin'), admin);
    });

    it("succeeds if called by pendingAnchorAdmin", async () => {
      const oracle = await makePriceOracle({kind: 'anchor', poster});
      assert.oracleSuccess(await setPendingAnchorAdmin(oracle, admin, root));
      assert.oracleSuccess(await send(oracle, '_acceptAnchorAdmin', [], {from: admin}));
      assert.hasOracleFailure(
        await send(oracle, '_acceptAnchorAdmin', [], {from: admin}),
        'UNAUTHORIZED',
        'ACCEPT_ANCHOR_ADMIN_PENDING_ANCHOR_ADMIN_CHECK'
      );
      assert.equal(await call(oracle, 'anchorAdmin'), admin);
      assert.equal(await call(oracle, 'pendingAnchorAdmin'), address(0));
    });
  });

  describe('pause', async () => {
    let oracle, assets; before(async () => ({oracle, assets} = await setupPriceTest(1)));

    it("starts unpaused", async () => {
      assert.oracleSuccess(await setPrice(oracle, assets[0], 0.3, poster));
      assert.isFalse(await call(oracle, 'paused'));
      assert.numEqual(await getPrice(oracle, assets[0]), etherMantissa(0.3));
    });

    it("can be paused and unpaused by admin and not by others", async () => {
      const result1 = await send(oracle, '_setPaused', [true], {from: poster});
      assert.hasOracleFailure(result1, 'UNAUTHORIZED', 'SET_PAUSED_OWNER_CHECK');
      assert.isFalse(await call(oracle, 'paused'));

      const result2 = await send(oracle, '_setPaused', [true]);
      assert.oracleSuccess(result2);
      assert.hasLog(result2, 'SetPaused', {newState: true});
      assert.isTrue(await call(oracle, 'paused'));

      const result3 = await send(oracle, '_setPaused', [true], {from: accounts[3]});
      assert.hasOracleFailure(result3, 'UNAUTHORIZED', 'SET_PAUSED_OWNER_CHECK');
      assert.isTrue(await call(oracle, 'paused'));

      const result4 = await send(oracle, '_setPaused', [false]);
      assert.oracleSuccess(result4);
      assert.hasLog(result4, 'SetPaused', {newState: false});
      assert.isFalse(await call(oracle, 'paused'));
    });

    it("returns 0 when paused", async () => {
      assert.oracleSuccess(await setPrice(oracle, assets[0], 0.3, poster));
      assert.numEqual(await getPrice(oracle, assets[0]), etherMantissa(0.3));
      assert.oracleSuccess(await send(oracle, '_setPaused', [true]));
      assert.numEqual(await getPrice(oracle, assets[0]), 0);
    });
  });

  describe("getPrice / setPrices", async () => {
    [1, 5, 20].forEach((numAssets) => {
      it(`accepts ${numAssets} initial price(s)`, async () => {
        const {oracle, assets, prices} = await setupPriceTest(numAssets);
        const result = await setPrices(oracle, assets, prices, poster);
        assert.oracleSuccess(result);
        assert.hasNoLog('CappedPricePosted');
        for (let i = 0; i < numAssets; i++) {
          await validatePriceAndAnchors(oracle, assets[i], prices[i], prices[i]);
          assert.hasLog(result, numAssets > 1 ? ['PricePosted', i] : 'PricePosted', {
            asset: assets[i]._address,
            previousPriceMantissa: '0',
            requestedPriceMantissa: etherMantissa(prices[i]).toString(),
            newPriceMantissa: etherMantissa(prices[i]).toString()
          });
        }
      });
    });

    it("handles partial failures", async () => {
      const {oracle, assets} = await setupPriceTest(5), prices = [5, 5, 5, 5, 0];
      const result = await setPrices(oracle, assets, prices, poster);
      assets.slice(0, 4).forEach((asset, i) => {
        assert.hasLog(result, ['PricePosted', i], {asset: asset._address})
      });
      assert.hasNoLog(result, ['PricePosted', 4]);
      assert.hasOracleFailure(result, 'FAILED_TO_SET_PRICE', 'SET_PRICE_NO_ANCHOR_PRICE_OR_INITIAL_PRICE_ZERO');
    });

    it("rejects mismatched param array sizes", async () => {
      const {oracle, assets, prices} = await setupPriceTest(3);
      assert.hasOracleFailure(
        await setPrices(oracle, assets, prices.concat([0]), poster),
        'FAILED_TO_SET_PRICE',
        'SET_PRICES_PARAM_VALIDATION'
      );
      assert.hasOracleFailure(
        await setPrices(oracle, [], [], poster),
        'FAILED_TO_SET_PRICE',
        'SET_PRICES_PARAM_VALIDATION'
      );
    });

    it("rejects caller who is not poster", async () => {
      const {oracle, assets, prices} = await setupPriceTest(3);
      assert.hasOracleFailure(
        await setPrices(oracle, assets, prices, root),
        'UNAUTHORIZED',
        'SET_PRICE_PERMISSION_CHECK'
      );
    });
  });

  describe("setPrice", async () => {
    let oracle, asset; before(async () => ({oracle, assets: [asset]} = await setupPriceTest(1)));

    it("accepts an asset address of 0", async () => {
      await setPriceAndValidate(oracle, {_address: address(0)}, 0.3, poster);
    });

    it("accepts an initial price and in-range non-initial price", async () => {
      await setPriceAndValidate(oracle, asset, 10, poster);
      await setPriceAndValidate(oracle, asset, 10.05, poster);
      await validatePriceAndAnchors(oracle, asset, 10.05, 10, 0);
    });

    it("caps to max an over-range non-initial price", async () => {
      await setPriceAndValidate(oracle, asset, 10, poster);
      await setPriceAndValidate(oracle, asset, 20, poster, 11);
      await validatePriceAndAnchors(oracle, asset, 11, 10, 0);
    });

    it("caps to max an under-range non-initial price", async () => {
      await setPriceAndValidate(oracle, asset, 10, poster);
      await setPriceAndValidate(oracle, asset, 0, poster, 9);
      await validatePriceAndAnchors(oracle, asset, 9, 10, 0);
    });

    it("rejects an out-of-range price even with a delta of 1", async () => {
      assert.oracleSuccess(await setPendingAnchorPrice(oracle, asset, 3));
      assert.hasOracleFailure(
        await setPrice(oracle, asset, 4, poster),
        'FAILED_TO_SET_PRICE',
        'SET_PRICE_MAX_SWING_CHECK'
      );
      await validatePriceAndAnchors(oracle, asset, 9, 10, 3);
    });

    it("rejects a way out of range price", async () => {
      assert.oracleSuccess(await setPendingAnchorPrice(oracle, asset, 0.3));
      assert.hasOracleFailure(
        await setPrice(oracle, asset, -1, poster),
        'FAILED_TO_SET_PRICE',
        'SET_PRICE_CALCULATE_SWING'
      );
      await validatePriceAndAnchors(oracle, asset, 9, 10, 0.3);
    });

    it("accepts an in-range of pending anchor non-initial price", async () => {
      assert.oracleSuccess(await setPendingAnchorPrice(oracle, asset, 10));
      await setPriceAndValidate(oracle, asset, 10.5, poster);
      await validatePriceAndAnchors(oracle, asset, 10.5, 10.5, 0);
    });

    it("rejects an out-of-range of pending anchor non-initial price", async () => {
      assert.oracleSuccess(await setPendingAnchorPrice(oracle, asset, 10));
      assert.oracleSuccess(await send(oracle, 'harnessClearStoredPrice', [asset._address]));
      assert.hasOracleFailure(
        await setPrice(oracle, asset, 0.3, poster),
        'FAILED_TO_SET_PRICE',
        'SET_PRICE_MAX_SWING_CHECK'
      );
      await validatePriceAndAnchors(oracle, asset, 0, 10.5, 10);
    });
  });

  describe("setPrice pending anchor failures", async () => {
    let oracle, asset; before(async () => ({oracle, assets: [asset]} = await setupPriceTest(1)));

    it("fails gracefully if pending anchor set and zero price provided", async () => {
      // when there is a pending anchor its an error (not capping) to move the price too far
      assert.oracleSuccess(await setPrice(oracle, asset, 0.3, poster));
      assert.oracleSuccess(await setPendingAnchorPrice(oracle, asset, 10));
      assert.hasOracleFailure(
        await setPrice(oracle, asset, 0, poster),
        'FAILED_TO_SET_PRICE',
        'SET_PRICE_MAX_SWING_CHECK'
      );

      // setting the price to 0 is always too far
      assert.oracleSuccess(await setPendingAnchorPrice(oracle, asset, .1));
      assert.hasOracleFailure(
        await setPrice(oracle, asset, 0, poster),
        'FAILED_TO_SET_PRICE',
        'SET_PRICE_MAX_SWING_CHECK'
      );
    });
  });

  describe("setPrice anchor failures", async () => {
    let oracle, asset; before(async () => ({oracle, assets: [asset]} = await setupPriceTest(1)));

    it("fails gracefully if capToMax fails", async () => {
      assert.oracleSuccess(await setAnchor(oracle, asset, -1, 1));
      assert.hasOracleFailure(
        await setPrice(oracle, asset, 3, poster),
        'FAILED_TO_SET_PRICE',
        'SET_PRICE_CAP_TO_MAX'
      );
      assert.numEqual(await call(oracle, 'numSetPriceCalls', [asset._address]), 0);
    });

    it("fails gracefully if anchorPrice is zero and anchor period is non-zero", async () => {
      assert.oracleSuccess(await setAnchor(oracle, asset, 0, 1));
      assert.hasOracleFailure(
        await setPrice(oracle, asset, 3, poster),
        'FAILED_TO_SET_PRICE',
        'SET_PRICE_NO_ANCHOR_PRICE_OR_INITIAL_PRICE_ZERO'
      );
      assert.numEqual(await call(oracle, 'numSetPriceCalls', [asset._address]), 0);
    });

    it("fails gracefully if initial price is zero", async () => {
      assert.hasOracleFailure(
        await setPrice(oracle, asset, 0, poster),
        'FAILED_TO_SET_PRICE',
        'SET_PRICE_NO_ANCHOR_PRICE_OR_INITIAL_PRICE_ZERO'
      );
      assert.numEqual(await call(oracle, 'numSetPriceCalls', [asset._address]), 0);
    });
  });
});
