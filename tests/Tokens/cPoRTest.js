const {
  etherUnsigned,
  etherMantissa,
  increaseTime,
  getTime,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeCToken,
  makeToken,
  setBorrowRate,
  pretendBorrow,
  totalSupply,
  mintFresh,
  preMint,
  quickMint
} = require('../Utils/Compound');

const exchangeRate = 50e3;
const mintAmount = etherUnsigned(10e4);
const mintTokens = mintAmount.dividedBy(exchangeRate);

describe('CPoR', function () {
  let minter, cToken, impl, token, feed;
  beforeEach(async () => {
    [, minter] = saddle.accounts;
    feed = await deploy('MockV3Aggregator', [8, 100000000]);
    token = await makeToken({
      kind: 'erc20',
      decimals: 8,
      quantity: 100000000
    });
    cToken = await makeCToken({
      kind: 'cpor',
      comptrollerOpts: {
        kind: 'bool'
      },
      exchangeRate,
      underlying: token
    });
    impl = await saddle.getContractAt('CPoR', cToken._address);
  });

  describe('mintFresh', () => {
    beforeEach(async () => {
      await preMint(cToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it('should mint like normal if the feed is unset', async () => {
      expect(await mintFresh(cToken, minter, mintAmount)).toSucceed();
    });

    it('should mint if the feed is set and heartbeat is unset', async () => {
      await send(impl, '_setFeed', [feed._address]);
      expect(await call(impl, 'feed')).toEqual(feed._address);
      expect(await mintFresh(cToken, minter, mintAmount)).toSucceed();
    });

    it('should mint if the feed is set and heartbeat is set', async () => {
      await send(impl, '_setFeed', [feed._address]);
      await send(impl, '_setHeartbeat', [86400]);
      const currentTime = await getTime();
      const updatedAt = await call(feed, 'latestTimestamp');
      const heartbeat = await call(impl, 'heartbeat');
      expect(currentTime - heartbeat > updatedAt).toEqual(false);
      expect(await call(impl, 'feed')).toEqual(feed._address);
      expect(await mintFresh(cToken, minter, mintAmount)).toSucceed();
    });

    it('should mint if the feed decimals is less than the underlying decimals', async () => {
      const newFeed = await deploy('MockV3Aggregator', [6, 1000000]);
      await send(impl, '_setFeed', [newFeed._address]);
      expect(await call(impl, 'feed')).toEqual(newFeed._address);
      expect(await mintFresh(cToken, minter, mintAmount)).toSucceed();
    });

    it('should mint if the feed decimals is more than the underlying decimals', async () => {
      const newFeed = await deploy('MockV3Aggregator', [18, etherUnsigned(1e18)]);
      await send(impl, '_setFeed', [newFeed._address]);
      expect(await call(impl, 'feed')).toEqual(newFeed._address);
      expect(await mintFresh(cToken, minter, mintAmount)).toSucceed();
    });

    it('should revert if the feed is not updated within the heartbeat', async () => {
      await send(impl, '_setFeed', [feed._address]);
      await send(impl, '_setHeartbeat', [1]);
      await increaseTime(10);
      const currentTime = await getTime();
      const updatedAt = await call(feed, 'latestTimestamp');
      const heartbeat = await call(impl, 'heartbeat');
      expect(currentTime - heartbeat > updatedAt).toEqual(true);
      expect(await call(impl, 'feed')).toEqual(feed._address);
      expect(await mintFresh(cToken, minter, mintAmount)).toHaveTokenFailure('TOKEN_MINT_ERROR', 'MINT_FEED_HEARTBEAT_CHECK');
    });

    it('should revert if the reserves are not met', async () => {
      await send(impl, '_setFeed', [feed._address]);
      await send(token, 'mint', [1]);
      expect(await mintFresh(cToken, minter, mintAmount)).toHaveTokenFailure('TOKEN_MINT_ERROR', 'MINT_FEED_SUPPLY_CHECK');
    });
  });

  describe('_setFeed', () => {
    it('should only be callable by admin', async () => {
      expect(await send(impl, '_setFeed', [feed._address], {from: minter})).toHaveTokenFailure('UNAUTHORIZED', 'SET_FEED_ADMIN_OWNER_CHECK');
    });

    it('should set the feed', async () => {
      expect(await send(impl, '_setFeed', [feed._address])).toSucceed();
      expect(await call(impl, 'feed')).toEqual(feed._address);
    });

    it('should unset the feed', async () => {
      expect(await send(impl, '_setFeed', [feed._address])).toSucceed();
      expect(await call(impl, 'feed')).toEqual(feed._address);
      const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
      expect(await send(impl, '_setFeed', [ZERO_ADDRESS])).toSucceed();
      expect(await call(impl, 'feed')).toEqual(ZERO_ADDRESS);
    });
  });

  describe('_setHeartbeat', () => {
    it('should only be callable by admin', async () => {
      expect(await send(impl, '_setHeartbeat', [1], {from: minter})).toHaveTokenFailure('UNAUTHORIZED', 'SET_FEED_HEARTBEAT_ADMIN_OWNER_CHECK');
    });

    it('should revert if newHeartbeat > MAX_AGE', async () => {
      expect(await send(impl, '_setHeartbeat', [864000 * 7 + 1])).toHaveTokenFailure('BAD_INPUT', 'SET_FEED_HEARTBEAT_INPUT_CHECK');
    });

    it('should set the heartbeat', async () => {
      expect(await send(impl, '_setHeartbeat', [1])).toSucceed();
      expect(await call(impl, 'heartbeat')).toEqual('1');
    });

    it('should unset the heartbeat', async () => {
      expect(await send(impl, '_setHeartbeat', [1])).toSucceed();
      expect(await call(impl, 'heartbeat')).toEqual('1');
      expect(await send(impl, '_setHeartbeat', [0])).toSucceed();
      expect(await call(impl, 'heartbeat')).toEqual('0');
    });
  });
});
