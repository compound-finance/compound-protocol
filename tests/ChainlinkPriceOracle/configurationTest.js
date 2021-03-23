const {
  address
} = require('../Utils/Ethereum');

describe('admin configuration functions', () => {
  let root, failoverAdmin, cToken, feed, failoverFeed, accounts;
  let clPriceOracle;
  beforeEach(async () => {
    [root, failoverAdmin, cToken, feed, failoverFeed, ...accounts] = saddle.accounts;
    clPriceOracle = await deploy('ChainlinkPriceOracle', [failoverAdmin], {from: root});
  });

  describe('admin()', () => {
    it('should return correct admin', async () => {
      expect(await call(clPriceOracle, 'admin')).toEqual(root);
    });
  });

  describe('failoverAdmin()', () => {
    it('should return correct failoverAdmin', async () => {
      expect(await call(clPriceOracle, 'failoverAdmin')).toEqual(failoverAdmin);
    })
  })

  describe('_setAdmin()', () => {
    it('should only be callable by admin', async () => {
      expect(
        await send(clPriceOracle, '_setAdmin', [accounts[0]], {from: accounts[1]})
      ).toHaveOracleFailure('UNAUTHORIZED', 'SET_ADMIN_OWNER_CHECK');

      const response = await call(clPriceOracle, 'admin');
      expect(response).toEqual(root)
    })

    it('should only allow a different admin to be set', async () => {
      expect(
        await send(clPriceOracle, '_setAdmin', [root], {from: root})
      ).toHaveOracleFailure('BAD_INPUT', 'SET_ADMIN_NO_CHANGE');
    })

    it('should set the new admin', async () => {
      const newAdmin = accounts[0]
      expect(
        await send(clPriceOracle, '_setAdmin', [newAdmin], {from: root})
      ).toSucceed();

      const response = await call(clPriceOracle, 'admin');
      expect(response).toEqual(newAdmin)
    })

    it('should emit an event', async () => {
      const newAdmin = accounts[0]

      const result = await send(clPriceOracle, '_setAdmin', [newAdmin], {from: root})
      expect(result).toHaveLog('AdminChanged', {
        oldAdmin: root,
        newAdmin: newAdmin
      });
    })
  })

  describe('_setFailoverAdmin()', () => {
    it('should only be callable by admin', async () => {
      expect(
        await send(clPriceOracle, '_setFailoverAdmin', [accounts[0]], {from: accounts[1]})
      ).toHaveOracleFailure('UNAUTHORIZED', 'SET_FAILOVER_ADMIN_OWNER_CHECK');

      const response = await call(clPriceOracle, 'failoverAdmin');
      expect(response).toEqual(failoverAdmin)
    })

    it('should only allow a different failover admin to be set', async () => {
      expect(
        await send(clPriceOracle, '_setFailoverAdmin', [failoverAdmin], {from: root})
      ).toHaveOracleFailure('BAD_INPUT', 'SET_FAILOVER_ADMIN_NO_CHANGE');
    })

    it('should set the new failover admin', async () => {
      const newFailoverAdmin = accounts[0]
      expect(
        await send(clPriceOracle, '_setFailoverAdmin', [newFailoverAdmin], {from: root})
      ).toSucceed();

      const response = await call(clPriceOracle, 'failoverAdmin');
      expect(response).toEqual(newFailoverAdmin)
    })

    it('should emit an event', async () => {
      const newFailoverAdmin = accounts[0]

      const result = await send(clPriceOracle, '_setFailoverAdmin', [newFailoverAdmin], {from: root})
      expect(result).toHaveLog('FailoverAdminChanged', {
        oldFailoverAdmin: failoverAdmin,
        newFailoverAdmin: newFailoverAdmin
      });
    })
  })

  describe('_setPriceFeed()', () => {
    it('should only be callable by admin', async () => {
      expect(
        await send(clPriceOracle, '_setPriceFeed', [cToken, feed, failoverFeed], {from: accounts[0]})
      ).toHaveOracleFailure('UNAUTHORIZED', 'SET_PRICE_FEED_OWNER_CHECK');

      // Check feed has not been added
      const response = await call(clPriceOracle, 'priceFeeds', [cToken]);
      expect(response).toBeAddressZero();
    });

    it('should not allow zero addresses', async () => {
      const zeroAddress = address(0);
      expect(
        await send(clPriceOracle, '_setPriceFeed', [cToken, feed, zeroAddress], {from: root})
      ).toHaveOracleFailure('BAD_INPUT', 'SET_PRICE_FEED_ZERO_ADDRESS')

      expect(
        await send(clPriceOracle, '_setPriceFeed', [cToken, zeroAddress, failoverFeed], {from: root})
      ).toHaveOracleFailure('BAD_INPUT', 'SET_PRICE_FEED_ZERO_ADDRESS')
    })

    it('should not allow failover to equal price feed', async () => {
      expect(
        await send(clPriceOracle, '_setPriceFeed', [cToken, feed, feed], {from: root})
      ).toHaveOracleFailure('BAD_INPUT', 'SET_PRICE_FEED_INVALID_FAILOVER')
    })

    it('should properly add the new price feed', async () => {
      expect(
        await send(clPriceOracle, '_setPriceFeed', [cToken, feed, failoverFeed], {from: root})
      ).toSucceed();

      // Check that the feed was added for the cToken
      const response = await call(clPriceOracle, 'priceFeeds', [cToken]);
      expect(response).toEqual(feed);
    });

    it('should properly add the failover price feed', async () => {
      expect(
        await send(clPriceOracle, '_setPriceFeed', [cToken, feed, failoverFeed], {from: root})
      ).toSucceed();

      // Check that the failover feed was added for the cToken
      const response = await call(clPriceOracle, 'failoverFeeds', [cToken]);
      expect(response).toEqual(failoverFeed);
    })

    it('should emit event', async () => {
      const result = await send(clPriceOracle, '_setPriceFeed', [cToken, feed, failoverFeed], {from: root})
      expect(result).toHaveLog('PriceFeedSet', {
        cTokenAddress: cToken,
        newPriceFeed: feed,
        failoverPriceFeed: failoverFeed
      });
    });
  });

  describe('_failoverPriceFeed()', () => {
    beforeEach(async () => {
      await send(clPriceOracle, '_setPriceFeed', [cToken, feed, failoverFeed], {from: root})
    })

    it('should only be callable by admin or failoverAdmin', async () => {
      expect(
        await send(clPriceOracle, '_failoverPriceFeed', [cToken], {from: accounts[0]})
      ).toHaveOracleFailure('UNAUTHORIZED', 'FAILOVER_PRICE_FEED_OWNER_CHECK');

      const response = await call(clPriceOracle, 'priceFeeds', [cToken])
      expect(response).toEqual(feed)
    })

    it('should fail if already failed over', async () => {
      expect(
        await send(clPriceOracle, '_failoverPriceFeed', [cToken], {from: failoverAdmin})
      ).toSucceed();

      expect(
        await send(clPriceOracle, '_failoverPriceFeed', [cToken], {from: root})
      ).toHaveOracleFailure('CANNOT_FAILOVER', 'ALREADY_FAILED_OVER');
    })

    it('should properly fail over', async () => {
      expect(
        await send(clPriceOracle, '_failoverPriceFeed', [cToken], {from: failoverAdmin})
      ).toSucceed();

      const response = await call(clPriceOracle, 'priceFeeds', [cToken]);
      expect(response).toEqual(failoverFeed);
    })

    it('should emit an event', async () => {
      const result = await send(clPriceOracle, '_failoverPriceFeed', [cToken], {from: root})
      expect(result).toHaveLog('PriceFeedFailover', {
        cTokenAddress: cToken,
        oldPriceFeed: feed,
        failoverPriceFeed: failoverFeed
      });
    })
  })
});
