describe('getUnderlyingPrice', () => {
    let root, cToken, feed, failoverFeed, accounts;
    let clPriceOracle;
    beforeEach(async () => {
        [root, cToken, ...accounts] = saddle.accounts;
        clPriceOracle = await deploy('ChainlinkPriceOracle', [root], {from: root});
        feed = await deploy('MockAggregatorV3', {from: root});
        failoverFeed = await deploy('MockAggregatorV3', {from: root});
    })

    it('should revert if the feed does not exist', async () => {
        let errored = false;
        try {
            await call(clPriceOracle, 'getUnderlyingPrice', [cToken]);
        } catch (err) {
            expect(err.results[err.hashes[0]].reason).toEqual('Price feed doesn\'t exist');
            errored = true;
        }
        expect(errored).toEqual(true);

    })

    it('should revert if the price is negative', async () => {
        // Set a negative answer in the feed
        const negativeAnswer = -1;
        expect(
            await send(feed, 'setAnswer', [negativeAnswer.toString()], {from: root})
        ).toSucceed();

        // Add the feed to the oracle
        expect(
            await send(clPriceOracle, '_setPriceFeed', [cToken, feed.options.address, failoverFeed.options.address], {from: root})
        ).toSucceed();

        // Run the test
        let errored = false;
        try {
            await call(clPriceOracle, 'getUnderlyingPrice', [cToken]);
        } catch (err) {
            expect(err.results[err.hashes[0]].reason).toEqual('Price cannot be negative');
            errored = true;
        }
        expect(errored).toEqual(true);
    })

    it('should return the correct value', async () => {
        const answer = 2*10**18;

        // Set the answer in the feed
        expect(
            await send(feed, 'setAnswer', [answer.toString()], {from: root})
        ).toSucceed();
        // Add the feed to the oracle
        expect(
            await send(clPriceOracle, '_setPriceFeed', [cToken, feed.options.address, failoverFeed.options.address], {from: root})
        ).toSucceed();
        // Run the test
        expect(
            await call(clPriceOracle, 'getUnderlyingPrice', [cToken])
        ).toEqual(answer.toString());
    })

})
