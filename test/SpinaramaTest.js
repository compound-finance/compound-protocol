const {
  etherMantissa,
  minerStart,
  minerStop,
  send,
  call
} = require('./Utils/MochaTruffle');

const {
  makeCToken,
  balanceOf,
  borrowSnapshot,
  enterMarkets
} = require('./Utils/Compound');

contract('Spinarama', function([root, from, ...accounts]) {
  describe('#mintMint', async () => {
    it('should succeed', async () => {
      const cToken = await makeCToken({supportMarket: true});
      await send(cToken.underlying, 'harnessSetBalance', [from, 100], {from});
      await send(cToken.underlying, 'approve', [cToken._address, -1], {from});
      await minerStop();
      const p1 = send(cToken, 'mint', [1], {from});
      const p2 = send(cToken, 'mint', [2], {from});
      await minerStart();
      assert.success(await p1);
      assert.success(await p2);
      assert.numEqual(await balanceOf(cToken, from), 3);
    });

    it('should partial succeed', async () => {
      const cToken = await makeCToken({supportMarket: true});
      await send(cToken.underlying, 'harnessSetBalance', [from, 100], {from});
      await send(cToken.underlying, 'approve', [cToken._address, 10], {from});
      await minerStop();
      const p1 = send(cToken, 'mint', [11], {from});
      const p2 = send(cToken, 'mint', [10], {from});
      await minerStart();
      assert.hasTokenFailure(await p1, 'TOKEN_INSUFFICIENT_ALLOWANCE', 'MINT_TRANSFER_IN_NOT_POSSIBLE');
      assert.success(await p2);
      assert.numEqual(await balanceOf(cToken, from), 10);
    });
  });

  describe('#mintRedeem', async () => {
    it('should succeed', async () => {
      const cToken = await makeCToken({supportMarket: true});
      await send(cToken.underlying, 'harnessSetBalance', [from, 100], {from});
      await send(cToken.underlying, 'approve', [cToken._address, 10], {from});
      await minerStop();
      const p1 = send(cToken, 'mint', [10], {from});
      const p2 = send(cToken, 'redeemUnderlying', [10], {from});
      await minerStart();
      assert.success(await p1);
      assert.success(await p2);
      assert.numEqual(await balanceOf(cToken, from), 0);
    });
  });

  describe('#redeemMint', async () => {
    it('should succeed', async () => {
      const cToken = await makeCToken({supportMarket: true});
      await send(cToken, 'harnessSetTotalSupply', [10]);
      await send(cToken, 'harnessSetExchangeRate', [etherMantissa(1)]);
      await send(cToken, 'harnessSetBalance', [from, 10]);
      await send(cToken.underlying, 'harnessSetBalance', [cToken._address, 10]);
      await send(cToken.underlying, 'approve', [cToken._address, 10], {from});
      await minerStop();
      const p1 = send(cToken, 'redeem', [10], {from});
      const p2 = send(cToken, 'mint', [10], {from});
      await minerStart();
      assert.success(await p1);
      assert.success(await p2);
      assert.numEqual(await balanceOf(cToken, from), 10);
    });
  });

  describe('#repayRepay', async () => {
    it('should succeed', async () => {
      const cToken1 = await makeCToken({supportMarket: true, underlyingPrice: 1, collateralFactor: .5});
      const cToken2 = await makeCToken({supportMarket: true, underlyingPrice: 1, comptroller: cToken1.comptroller});
      await send(cToken1.underlying, 'harnessSetBalance', [from, 10]);
      await send(cToken1.underlying, 'approve', [cToken1._address, 10], {from});
      await send(cToken2.underlying, 'harnessSetBalance', [cToken2._address, 10]);
      await send(cToken2, 'harnessSetTotalSupply', [100]);
      await send(cToken2.underlying, 'approve', [cToken2._address, 10], {from});
      await send(cToken2, 'harnessSetExchangeRate', [etherMantissa(1)]);
      assert.success(await enterMarkets([cToken1, cToken2], from));
      assert.success(await send(cToken1, 'mint', [10], {from}));
      assert.success(await send(cToken2, 'borrow', [2], {from}));
      await minerStop();
      const p1 = send(cToken2, 'repayBorrow', [1], {from});
      const p2 = send(cToken2, 'repayBorrow', [1], {from});
      await minerStart();
      assert.success(await p1);
      assert.success(await p2);
      assert.numEqual((await borrowSnapshot(cToken2, from)).principal, 0);
    });

    // XXX not yet converted below this point...moving on to certora

    it.skip('can have partial failure succeed', async () => {
      const {moneyMarketHarness,
        priceOracle,
        interestRateModel} = await setupMoneyMarket(root);
      const spinarama = await Spinarama.new(moneyMarketHarness._address).send({from: root});
      const OMG = await setupSupply(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);
      const BAT = await setupBorrow(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);

      // Add cash to the protocol
      await addCash(moneyMarketHarness, BAT, root);

      // Supply some collateral
      assert.success(
        await spinarama.methods.supply(OMG._address, 15).send({from: accounts[0]}));

      // Now borrow 5 bat
      assert.success(
        await spinarama.methods.borrow(BAT._address, 5).send({from: accounts[0]}));

      // And repay it, repay it
      const {'0': err0, '1': err1} = await spinarama.methods.repayRepay(BAT._address, 100, 1).call({from: accounts[0]});

      assert.hasErrorCode(err0, ErrorEnum.INTEGER_UNDERFLOW);
      assert.hasErrorCode(err1, ErrorEnum.NO_ERROR);
    });
  });

  describe('#borrowRepayBorrow', async () => {
    it.skip('should fail', async () => {
      const {moneyMarketHarness,
        priceOracle,
        interestRateModel} = await setupMoneyMarket(root);
      const spinarama = await Spinarama.new(moneyMarketHarness._address).send({from: root});
      const OMG = await setupSupply(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);
      const BAT = await setupBorrow(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);

      // Add cash to the protocol
      await addCash(moneyMarketHarness, BAT, root);

      // Supply some collateral
      assert.success(
        await spinarama.methods.supply(OMG._address, 15).send({from: accounts[0]}));

      // Borrow then repayBorrow should revert
      await assert.revert(spinarama.methods.borrowRepayBorrow(BAT._address, 5, 1).call({from: accounts[0]}));
    });

    it.skip('can succeed with partial failure', async () => {
      const {moneyMarketHarness,
        priceOracle,
        interestRateModel} = await setupMoneyMarket(root);
      const spinarama = await Spinarama.new(moneyMarketHarness._address).send({from: root});
      const OMG = await setupSupply(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);
      const BAT = await setupBorrow(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);

      // Add cash to the protocol
      await addCash(moneyMarketHarness, BAT, root);

      // Supply some collateral
      assert.success(
        await spinarama.methods.supply(OMG._address, 15).send({from: accounts[0]}));

      // Borrow a little, repay a lot
      const {'0': err0, '1': err1} = await spinarama.methods.borrowRepayBorrow(BAT._address, 1, 1000).call({from: accounts[0]});

      assert.hasErrorCode(err0, ErrorEnum.NO_ERROR);
      assert.hasErrorCode(err1, ErrorEnum.INTEGER_UNDERFLOW);
    });
  });

  describe('#borrowSupply', async () => {
    it.skip('should fail in same asset', async () => {
      const {moneyMarketHarness,
        priceOracle,
        interestRateModel} = await setupMoneyMarket(root);
      const spinarama = await Spinarama.new(moneyMarketHarness._address).send({from: root});
      const OMG = await setupSupply(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);
      const BAT = await setupBorrow(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);

      // Add cash to the protocol
      await addCash(moneyMarketHarness, BAT, root);

      // Supply some collateral
      assert.success(
        await spinarama.methods.supply(OMG._address, 15).send({from: accounts[0]}));

      // Borrow then supply should revert
      await assert.revert(spinarama.methods.borrowSupply(BAT._address, BAT._address, 5, 1).call({from: accounts[0]}));
    });

    it.skip('should fail, even in different assets', async () => {
      const {moneyMarketHarness,
        priceOracle,
        interestRateModel} = await setupMoneyMarket(root);
      const spinarama = await Spinarama.new(moneyMarketHarness._address).send({from: root});
      const OMG = await setupSupply(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);
      const BAT = await setupBorrow(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);

      // Add cash to the protocol
      await addCash(moneyMarketHarness, BAT, root);

      // Supply some collateral
      assert.success(
        await spinarama.methods.supply(OMG._address, 15).send({from: accounts[0]}));

      // Borrow then supply in different assets
      await assert.revert(spinarama.methods.borrowSupply(BAT._address, OMG._address, 5, 1).call({from: accounts[0]}));
    });
  });

  describe('#supplyLiquidate', async () => {
    it.skip('should fail', async () => {
      const {moneyMarketHarness,
        priceOracle,
        interestRateModel} = await setupMoneyMarket(root);
      const spinarama = await Spinarama.new(moneyMarketHarness._address).send({from: root});
      const OMG = await setupSupply(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);
      const BAT = await setupBorrow(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);

      // Add cash to the protocol
      await addCash(moneyMarketHarness, BAT, root);

      // Supply some collateral
      assert.success(
        await spinarama.methods.supply(OMG._address, 15).send({from: accounts[0]}));

      await assert.revert(spinarama.methods.supplyLiquidate(OMG._address, 5, accounts[0], OMG._address, BAT._address, 0).call({from: accounts[0]}));
    });
  });

  describe('#withdrawLiquidate', async () => {
    it.skip('should fail', async () => {
      const {moneyMarketHarness,
        priceOracle,
        interestRateModel} = await setupMoneyMarket(root);
      const spinarama = await Spinarama.new(moneyMarketHarness._address).send({from: root});
      const OMG = await setupSupply(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);
      const BAT = await setupBorrow(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);

      // Add cash to the protocol
      await addCash(moneyMarketHarness, BAT, root);

      // Supply some collateral
      assert.success(
        await spinarama.methods.supply(OMG._address, 15).send({from: accounts[0]}));

      await assert.revert(spinarama.methods.withdrawLiquidate(OMG._address, 5, accounts[0], OMG._address, BAT._address, 0).call({from: accounts[0]}));
    });
  });

  describe('#borrowLiquidate', async () => {
    it.skip('should fail', async () => {
      const {moneyMarketHarness,
        priceOracle,
        interestRateModel} = await setupMoneyMarket(root);
      const spinarama = await Spinarama.new(moneyMarketHarness._address).send({from: root});
      const OMG = await setupSupply(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);
      const BAT = await setupBorrow(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);

      // Add cash to the protocol
      await addCash(moneyMarketHarness, BAT, root);

      // Supply some collateral
      assert.success(
        await spinarama.methods.supply(OMG._address, 15).send({from: accounts[0]}));

      await assert.revert(spinarama.methods.borrowLiquidate(OMG._address, 5, accounts[0], OMG._address, BAT._address, 0).call({from: accounts[0]}));
    });
  });

  describe('#repayBorrowLiquidate', async () => {
    it.skip('should fail', async () => {
      const {moneyMarketHarness,
        priceOracle,
        interestRateModel} = await setupMoneyMarket(root)
      const spinarama = await Spinarama.new(moneyMarketHarness._address).send({from: root});
      const OMG = await setupSupply(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);
      const BAT = await setupBorrow(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);

      // Add cash to the protocol
      await addCash(moneyMarketHarness, BAT, root);

      // Supply some collateral
      assert.success(
        await spinarama.methods.supply(OMG._address, 15).send({from: accounts[0]}));

      // Borrow some OMG
      assert.success(
        await spinarama.methods.borrow(OMG._address, 5).send({from: accounts[0]}));

      await assert.revert(spinarama.methods.repayBorrowLiquidate(OMG._address, 1, accounts[0], OMG._address, BAT._address, 0).call({from: accounts[0]}));
    });
  });

  describe('#liquidateLiquidate', async () => {
    it.skip('should fail', async () => {
      const {moneyMarketHarness,
        priceOracle,
        interestRateModel} = await setupMoneyMarket(root)
      const spinarama = await Spinarama.new(moneyMarketHarness._address).send({from: root});
      const OMG = await setupSupply(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);
      const BAT = await setupBorrow(root, accounts[0], spinarama, moneyMarketHarness, priceOracle, interestRateModel);

      // Add cash to the protocol
      await addCash(moneyMarketHarness, BAT, root);

      // Supply some collateral
      assert.success(
        await spinarama.methods.supply(OMG._address, 15).send({from: accounts[0]}));

      await assert.revert(spinarama.methods.liquidateLiquidate(OMG._address, 1, accounts[0], OMG._address, BAT._address, 0).call({from: accounts[0]}));
    });
  });
});
