const {
  address
} = require('../Utils/Ethereum');

describe('admin / _setPriceFeed ', () => {
  let root, cToken, feed, accounts;
  let clPriceOracle;
  beforeEach(async () => {
    [root, cToken, feed, ...accounts] = saddle.accounts;
    clPriceOracle = await deploy('ChainlinkPriceOracle', {from: root});
  });

  describe('admin()', () => {
    it('should return correct admin', async () => {
      expect(await call(clPriceOracle, 'admin')).toEqual(root);
    });
  });

  describe('_setPriceFeed()', () => {
    it('should only be callable by admin', async () => {
      expect(
        await send(clPriceOracle, '_setPriceFeed', [cToken, feed], {from: accounts[0]})
      ).toHaveOracleFailure('UNAUTHORIZED', 'SET_PRICE_FEED_OWNER_CHECK');

      // Check feed has not been added
      const response = await call(clPriceOracle, 'priceFeeds', [feed]);
      expect(response).toBeAddressZero();
    });

    it('should properly add the new price feed', async () => {
      expect(
        await send(clPriceOracle, '_setPriceFeed', [cToken, feed], {from: root})
      ).toSucceed();

      // Check admin stays the same
      expect(await call(clPriceOracle, 'admin')).toEqual(root);
      // Check that the feed was added for the cToken
      const response = await call(clPriceOracle, 'priceFeeds', [cToken]);
      expect(response).toEqual(feed);
    });

    it('should emit event', async () => {
      const result = await send(clPriceOracle, '_setPriceFeed', [cToken, feed], {from: root})
      expect(result).toHaveLog('PriceFeedSet', {
        cTokenAddress: cToken,
        oldPriceFeed: address(0),
        newPriceFeed: feed
      });
    });
  });

});
