const {
  address
} = require('../Utils/Ethereum');

describe('admin configuration functions', () => {
  const decimals = 0
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
      await expect(
        send(clPriceOracle, '_setAdmin', [accounts[0]], {from: accounts[1]})
      ).rejects.toRevert('revert Must be admin');

      const response = await call(clPriceOracle, 'admin');
      expect(response).toEqual(root);
    })

    it('should only allow a different admin to be set', async () => {
      await expect(
        send(clPriceOracle, '_setAdmin', [root], {from: root})
      ).rejects.toRevert('revert Addresses are equal');
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
      await expect(
        send(clPriceOracle, '_setFailoverAdmin', [accounts[0]], {from: accounts[1]})
      ).rejects.toRevert('revert Must be admin');

      const response = await call(clPriceOracle, 'failoverAdmin');
      expect(response).toEqual(failoverAdmin)
    })

    it('should only allow a different failover admin to be set', async () => {
      await expect(
        send(clPriceOracle, '_setFailoverAdmin', [failoverAdmin], {from: root})
      ).rejects.toRevert('revert Addresses are equal');
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
      await expect(
        send(clPriceOracle, '_setPriceFeed', [cToken, feed, decimals, failoverFeed, decimals], {from: accounts[0]})
      ).rejects.toRevert('revert Must be admin');

      // Check feed has not been added
      const response = await call(clPriceOracle, 'priceFeeds', [cToken]);
      expect(response[0]).toBeAddressZero();
    });

    it('should not allow zero addresses', async () => {
      const zeroAddress = address(0);
      await expect(
        send(clPriceOracle, '_setPriceFeed', [cToken, feed, decimals, zeroAddress, decimals], {from: root})
      ).rejects.toRevert('revert Cannot be zero address');

      await expect(
        send(clPriceOracle, '_setPriceFeed', [cToken, zeroAddress, decimals, failoverFeed, decimals], {from: root})
      ).rejects.toRevert('revert Cannot be zero address');
    })

    it('should not allow extra decimals above 18', async () => {
      await expect(
        send(clPriceOracle, '_setPriceFeed', [cToken, feed, 19, failoverFeed, decimals], {from: root})
      ).rejects.toRevert('revert Max 18 extra decimals');

      await expect(
        send(clPriceOracle, '_setPriceFeed', [cToken, feed, decimals, failoverFeed, 19], {from: root})
      ).rejects.toRevert('revert Max 18 extra decimals');
    })

    it('should not allow failover to equal price feed', async () => {
      await expect(
        send(clPriceOracle, '_setPriceFeed', [cToken, feed, decimals, feed, decimals], {from: root})
      ).rejects.toRevert('revert Failover must differ from main')
    })

    it('should properly add the new price feed', async () => {
      expect(
        await send(clPriceOracle, '_setPriceFeed', [cToken, feed, decimals, failoverFeed, decimals], {from: root})
      ).toSucceed();

      // Check that the feed was added for the cToken
      const response = await call(clPriceOracle, 'priceFeeds', [cToken]);
      expect(response[0]).toEqual(feed);
    });

    it('should properly add the failover price feed', async () => {
      expect(
        await send(clPriceOracle, '_setPriceFeed', [cToken, feed, decimals, failoverFeed, decimals], {from: root})
      ).toSucceed();

      // Check that the failover feed was added for the cToken
      const response = await call(clPriceOracle, 'failoverFeeds', [cToken]);
      expect(response[0]).toEqual(failoverFeed);
    })

    it('should emit event', async () => {
      const result = await send(clPriceOracle, '_setPriceFeed', [cToken, feed, decimals, failoverFeed, decimals], {from: root})
      expect(result).toHaveLog('PriceFeedSet', {
        cTokenAddress: cToken,
        newPriceFeed: feed,
        failoverPriceFeed: failoverFeed
      });
    });
  });

  describe('_failoverPriceFeed()', () => {
    beforeEach(async () => {
      await send(clPriceOracle, '_setPriceFeed', [cToken, feed, decimals, failoverFeed, decimals], {from: root})
    })

    it('should only be callable by admin or failoverAdmin', async () => {
      await expect(
        send(clPriceOracle, '_failoverPriceFeed', [cToken], {from: accounts[0]})
      ).rejects.toRevert('revert Must be admin or failover admin');

      const response = await call(clPriceOracle, 'priceFeeds', [cToken])
      expect(response[0]).toEqual(feed)
    })

    it('should fail if already failed over', async () => {
      expect(
        await send(clPriceOracle, '_failoverPriceFeed', [cToken], {from: failoverAdmin})
      ).toSucceed();

      await expect(
        send(clPriceOracle, '_failoverPriceFeed', [cToken], {from: root})
      ).rejects.toRevert('revert Already failed over');
    })

    it('should properly fail over', async () => {
      expect(
        await send(clPriceOracle, '_failoverPriceFeed', [cToken], {from: failoverAdmin})
      ).toSucceed();

      const response = await call(clPriceOracle, 'priceFeeds', [cToken]);
      expect(response[0]).toEqual(failoverFeed);
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
