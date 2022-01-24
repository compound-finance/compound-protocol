const {
    makeComptroller,
    makeCToken,
    makeRewardsDistributor,
    balanceOf,
    fastForward,
    pretendBorrow,
    quickMint,
    quickBorrow,
    enterMarkets
} = require('../Utils/Compound');
const {
    etherExp,
    etherDouble,
    etherUnsigned,
    etherMantissa
} = require('../Utils/Ethereum');

const compRate = etherUnsigned(1e18);

const compInitialIndex = 1e36;

async function compAccrued(comptroller, user) {
    return etherUnsigned(await call(comptroller, 'compAccrued', [user]));
}

async function compBalance(comptroller, user) {
    return etherUnsigned(await call(comptroller.comp, 'balanceOf', [user]))
}

async function totalCompAccrued(comptroller, user) {
    return (await compAccrued(comptroller, user)).plus(await compBalance(comptroller, user));
}

describe('Flywheel', () => {
    let root, a1, a2, a3, accounts;
    let comptroller, distributor, cLOW, cREP, cZRX, cEVIL;
    beforeEach(async () => {
        let interestRateModelOpts = {borrowRate: 0.000001};
        [root, a1, a2, a3, ...accounts] = saddle.accounts;
        comptroller = await makeComptroller();
        distributor = await makeRewardsDistributor({rewardToken: comptroller.comp});
        await send(comptroller, '_addRewardsDistributor', [distributor._address]);

        cLOW = await makeCToken({comptroller, supportMarket: true, underlyingPrice: 1, interestRateModelOpts});
        cREP = await makeCToken({comptroller, supportMarket: true, underlyingPrice: 2, interestRateModelOpts});
        cZRX = await makeCToken({comptroller, supportMarket: true, underlyingPrice: 3, interestRateModelOpts});
        cEVIL = await makeCToken({comptroller, supportMarket: false, underlyingPrice: 3, interestRateModelOpts});
        cUSD = await makeCToken({comptroller, supportMarket: true, underlyingPrice: 1, collateralFactor: 0.5, interestRateModelOpts});
    });

    describe('_grantComp()', () => {
        beforeEach(async () => {
            await send(comptroller.comp, 'transfer', [distributor._address, etherUnsigned(50e18)], {from: root});
        });

        it('should award comp if called by admin', async () => {
            const tx = await send(distributor, '_grantComp', [a1, 100]);
            expect(tx).toHaveLog('CompGranted', {
                recipient: a1,
                amount: 100
            });
        });

        it('should revert if not called by admin', async () => {
            await expect(
                send(distributor, '_grantComp', [a1, 100], {from: a1})
            ).rejects.toRevert('revert only admin can grant comp');
        });

        it('should revert if insufficient comp', async () => {
            await expect(
                send(distributor, '_grantComp', [a1, etherUnsigned(1e20)])
            ).rejects.toRevert('revert insufficient comp for grant');
        });
    });

describe('getCompMarkets()', () => {
    it('should return the comp markets', async () => {
        for (let mkt of [cLOW, cREP, cZRX]) {
            //await send(distributor, '_setCompSpeeds', [[mkt._address], [etherExp(0.5)], [etherExp(0.5)]]);
            await send(distributor, '_setCompSpeeds', [[mkt._address], [etherExp(0.5).toString()], [etherExp(0.5).toString()]]);
        }
        expect(await call(comptroller, 'getCompMarkets')).toEqual(
            [cLOW, cREP, cZRX].map((c) => c._address)
        );
    });
});

describe('_setCompSpeeds()', () => {
    it('should update market index when calling setCompSpeed', async () => {
        const mkt = cREP;
        await send(distributor, 'setBlockNumber', [0]);
        await send(mkt, 'harnessSetTotalSupply', [etherUnsigned(10e18)]);

        await send(distributor, '_setCompSpeeds', [[mkt._address], [etherExp(0.5).toString()], [etherExp(0.5).toString()]]);
        await fastForward(distributor, 20);
        await send(distributor, '_setCompSpeeds', [[mkt._address], ['1000000000000000000'], [etherExp(0.5).toString()]]);

        const {index, block} = await call(distributor, 'compSupplyState', [mkt._address]);
        expect(index).toEqualNumber(2e36);
        expect(block).toEqualNumber(20);
    });

    it('should correctly drop a comp market if called by admin', async () => {
        for (let mkt of [cLOW, cREP, cZRX]) {
            await send(distributor, '_setCompSpeeds', [[mkt._address], [etherExp(0.5).toString()], [etherExp(0.5).toString()]]);
        }
        const tx = await send(distributor, '_setCompSpeeds', [[cLOW._address], [0], [0]]);
        expect(await call(comptroller, 'getCompMarkets')).toEqual(
            [cREP, cZRX].map((c) => c._address)
        );
        expect(tx).toHaveLog('CompBorrowSpeedUpdated', {
            cToken: cLOW._address,
            newSpeed: 0
        });
        expect(tx).toHaveLog('CompSupplySpeedUpdated', {
            cToken: cLOW._address,
            newSpeed: 0
        });
    });

    it('should correctly drop a comp market from middle of array', async () => {
        for (let mkt of [cLOW, cREP, cZRX]) {
            await send(distributor, '_setCompSpeeds', [[mkt._address], [etherExp(0.5).toString()], [etherExp(0.5).toString()]]);
        }
        await send(distributor, '_setCompSpeeds', [[cREP._address], [0], [0]]);
        expect(await call(comptroller, 'getCompMarkets')).toEqual(
            [cLOW, cZRX].map((c) => c._address)
        );
    });

    it('should not drop a comp market unless called by admin', async () => {
    for (let mkt of [cLOW, cREP, cZRX]) {
        await send(distributor, '_setCompSpeeds', [[mkt._address], [etherExp(0.5).toString()], [etherExp(0.5).toString()]]);
    }
    await expect(
        send(distributor, '_setCompSpeeds', [[cLOW._address], [0], [etherExp(0.5).toString()]], {from: a1})
    ).rejects.toRevert('revert only admin can set comp speed');
    });

    it('should not add non-listed markets', async () => {
    const cBAT = await makeCToken({ comptroller, supportMarket: false });
    await expect(
        send(distributor, 'harnessAddCompMarkets', [[cBAT._address]])
    ).rejects.toRevert('revert comp market is not listed');

    const markets = await call(comptroller, 'getCompMarkets');
    expect(markets).toEqual([]);
    });
});

describe('updateCompBorrowIndex()', () => {
    it('should calculate comp borrower index correctly', async () => {
        const mkt = cREP;
        await send(distributor, '_setCompSpeeds', [[mkt._address], [etherExp(0.5).toString()], [etherExp(0.5).toString()]]);
        await send(distributor, 'setBlockNumber', [100]);
        await send(mkt, 'harnessSetTotalBorrows', [etherUnsigned(11e18)]);
        await send(distributor, 'harnessUpdateCompBorrowIndex', [
            mkt._address,
            etherExp(1.1),
        ]);
    /*
        100 blocks, 10e18 origin total borrows, 0.5e18 borrowSpeed

        borrowAmt   = totalBorrows * 1e18 / borrowIdx
                    = 11e18 * 1e18 / 1.1e18 = 10e18
        compAccrued = deltaBlocks * borrowSpeed
                    = 100 * 0.5e18 = 50e18
        newIndex   += 1e36 + compAccrued * 1e36 / borrowAmt
                    = 1e36 + 50e18 * 1e36 / 10e18 = 6e36
    */

        const {index, block} = await call(distributor, 'compBorrowState', [mkt._address]);
        expect(index).toEqualNumber(6e36);
        expect(block).toEqualNumber(100);
    });

    /*it('should not revert or update compBorrowState index if cToken not in COMP markets', async () => {
        const mkt = await makeCToken({
            comptroller: comptroller,
            supportMarket: true,
            addCompMarket: false,
        });
        await send(distributor, 'setBlockNumber', [100]);
        await send(distributor, 'harnessUpdateCompBorrowIndex', [
            mkt._address,
            etherExp(1.1).toString(),
        ]);

        const {index, block} = await call(distributor, 'compBorrowState', [mkt._address]);
        expect(index).toEqualNumber(compInitialIndex);
        expect(block).toEqualNumber(100);
        const supplySpeed = await call(distributor, 'compSupplySpeeds', [mkt._address]);
        expect(supplySpeed).toEqualNumber(0);
        const borrowSpeed = await call(distributor, 'compBorrowSpeeds', [mkt._address]);
        expect(borrowSpeed).toEqualNumber(0);
    });*/

    it('should not update index if no blocks passed since last accrual', async () => {
        const mkt = cREP;
        await send(distributor, '_setCompSpeeds', [[mkt._address], [etherExp(0.5).toString()], [etherExp(0.5).toString()]]);
        await send(distributor, 'harnessUpdateCompBorrowIndex', [
            mkt._address,
            etherExp(1.1).toString(),
        ]);

        const {index, block} = await call(distributor, 'compBorrowState', [mkt._address]);
        expect(index).toEqualNumber(compInitialIndex);
        expect(block).toEqualNumber(0);
    });

    it('should not update index if comp speed is 0', async () => {
        const mkt = cREP;
        await send(distributor, '_setCompSpeeds', [[mkt._address], [etherExp(0.5).toString()], [etherExp(0.5).toString()]]);
        await send(distributor, 'setBlockNumber', [100]);
        await send(distributor, '_setCompSpeeds', [[mkt._address], [0], [0]]);
        await send(distributor, 'harnessUpdateCompBorrowIndex', [
            mkt._address,
            etherExp(1.1).toString(),
        ]);

        const {index, block} = await call(distributor, 'compBorrowState', [mkt._address]);
        expect(index).toEqualNumber(compInitialIndex);
        expect(block).toEqualNumber(100);
    });
});

describe('updateCompSupplyIndex()', () => {
    it('should calculate comp supplier index correctly', async () => {
        const mkt = cREP;
        await send(distributor, '_setCompSpeeds', [[mkt._address], [etherExp(0.5).toString()], [etherExp(0.5).toString()]]);
        await send(distributor, 'setBlockNumber', [100]);
        await send(mkt, 'harnessSetTotalSupply', [etherUnsigned(10e18)]);
        await send(distributor, 'harnessUpdateCompSupplyIndex', [mkt._address]);
        /*
            suppyTokens = 10e18
            compAccrued = deltaBlocks * supplySpeed
                        = 100 * 0.5e18 = 50e18
            newIndex   += compAccrued * 1e36 / supplyTokens
                        = 1e36 + 50e18 * 1e36 / 10e18 = 6e36
        */
        const {index, block} = await call(distributor, 'compSupplyState', [mkt._address]);
        expect(index).toEqualNumber(6e36);
        expect(block).toEqualNumber(100);
    });

    /*it('should not update index on non-COMP markets', async () => {
        const mkt = await makeCToken({
            comptroller: comptroller,
            supportMarket: true,
            addCompMarket: false
        });
        await send(distributor, 'setBlockNumber', [100]);
        await send(distributor, 'harnessUpdateCompSupplyIndex', [
            mkt._address
        ]);

        const {index, block} = await call(distributor, 'compSupplyState', [mkt._address]);
        expect(index).toEqualNumber(compInitialIndex);
        expect(block).toEqualNumber(100);
        const supplySpeed = await call(distributor, 'compSupplySpeeds', [mkt._address]);
        expect(supplySpeed).toEqualNumber(0);
        const borrowSpeed = await call(distributor, 'compBorrowSpeeds', [mkt._address]);
        expect(borrowSpeed).toEqualNumber(0);
        // ctoken could have no comp speed or comp supplier state if not in comp markets
        // this logic could also possibly be implemented in the allowed hook
    });*/

    it('should not update index if no blocks passed since last accrual', async () => {
        const mkt = cREP;
        await send(distributor, 'setBlockNumber', [0]);
        await send(mkt, 'harnessSetTotalSupply', [etherUnsigned(10e18)]);
        await send(distributor, '_setCompSpeeds', [[mkt._address], [etherExp(0.5).toString()], [etherExp(0.5).toString()]]);
        await send(distributor, 'harnessUpdateCompSupplyIndex', [mkt._address]);

        const {index, block} = await call(distributor, 'compSupplyState', [mkt._address]);
        expect(index).toEqualNumber(compInitialIndex);
        expect(block).toEqualNumber(0);
    });

    it('should not matter if the index is updated multiple times', async () => {
        const compRemaining = compRate.multipliedBy(100)
        await send(distributor, 'harnessAddCompMarkets', [[cLOW._address]]);
        await send(comptroller.comp, 'transfer', [distributor._address, compRemaining], {from: root});
        await pretendBorrow(cLOW, a1, 1, 1, 100);
        await send(distributor, 'harnessRefreshCompSpeeds', [comptroller._address]);

        await quickMint(cLOW, a2, etherUnsigned(10e18));
        await quickMint(cLOW, a3, etherUnsigned(15e18));

        const a2Accrued0 = await totalCompAccrued(distributor, a2);
        const a3Accrued0 = await totalCompAccrued(distributor, a3);
        const a2Balance0 = await balanceOf(cLOW, a2);
        const a3Balance0 = await balanceOf(cLOW, a3);

        await fastForward(distributor, 20);

        const txT1 = await send(cLOW, 'transfer', [a2, a3Balance0.minus(a2Balance0)], {from: a3});

        const a2Accrued1 = await totalCompAccrued(distributor, a2);
        const a3Accrued1 = await totalCompAccrued(distributor, a3);
        const a2Balance1 = await balanceOf(cLOW, a2);
        const a3Balance1 = await balanceOf(cLOW, a3);

        await fastForward(distributor, 10);
        await send(distributor, 'harnessUpdateCompSupplyIndex', [cLOW._address]);
        await fastForward(distributor, 10);

        const txT2 = await send(cLOW, 'transfer', [a3, a2Balance1.minus(a3Balance1)], {from: a2});

        const a2Accrued2 = await totalCompAccrued(distributor, a2);
        const a3Accrued2 = await totalCompAccrued(distributor, a3);
        console.log(a2Accrued0, a3Accrued0, a2Accrued1, a3Accrued1, a2Accrued2, a3Accrued2);
        expect(a2Accrued0).toEqualNumber(0);
        expect(a3Accrued0).toEqualNumber(0);
        expect(a2Accrued1).not.toEqualNumber(0);
        expect(a3Accrued1).not.toEqualNumber(0);
        expect(a2Accrued1).toEqualNumber(a3Accrued2.minus(a3Accrued1));
        expect(a3Accrued1).toEqualNumber(a2Accrued2.minus(a2Accrued1));

        expect(txT1.gasUsed).toBeLessThan(240000);
        expect(txT1.gasUsed).toBeGreaterThan(140000);
        expect(txT2.gasUsed).toBeLessThan(200000);
        expect(txT2.gasUsed).toBeGreaterThan(100000);
    });
});

describe('distributeBorrowerComp()', () => {

    it('should update borrow index checkpoint but not compAccrued for first time user', async () => {
        const mkt = cREP;
        await send(distributor, "setCompBorrowState", [mkt._address, etherDouble(6), 10]);
        await send(distributor, "setCompBorrowerIndex", [mkt._address, root, etherUnsigned(0)]);

        await send(distributor, "harnessDistributeBorrowerComp", [mkt._address, root, etherExp(1.1)]);
        expect(await call(distributor, "compAccrued", [root])).toEqualNumber(0);
        expect(await call(distributor, "compBorrowerIndex", [ mkt._address, root])).toEqualNumber(6e36);
        });

        it('should transfer comp and update borrow index checkpoint correctly for repeat time user', async () => {
        const mkt = cREP;
        await send(distributor.comp, 'transfer', [distributor._address, etherUnsigned(50e18)], {from: root});
        await send(mkt, "harnessSetAccountBorrows", [a1, etherUnsigned(5.5e18), etherExp(1)]);
        await send(distributor, "setCompBorrowState", [mkt._address, etherDouble(6), 10]);
        await send(distributor, "setCompBorrowerIndex", [mkt._address, a1, etherDouble(1)]);

        /*
        * 100 delta blocks, 10e18 origin total borrows, 0.5e18 borrowSpeed => 6e18 compBorrowIndex
        * this tests that an acct with half the total borrows over that time gets 25e18 COMP
            borrowerAmount = borrowBalance * 1e18 / borrow idx
                            = 5.5e18 * 1e18 / 1.1e18 = 5e18
            deltaIndex     = marketStoredIndex - userStoredIndex
                            = 6e36 - 1e36 = 5e36
            borrowerAccrued= borrowerAmount * deltaIndex / 1e36
                            = 5e18 * 5e36 / 1e36 = 25e18
        */
        const tx = await send(distributor, "harnessDistributeBorrowerComp", [mkt._address, a1, etherUnsigned(1.1e18)]);
        expect(await compAccrued(distributor, a1)).toEqualNumber(25e18);
        expect(await compBalance(distributor, a1)).toEqualNumber(0);
        expect(tx).toHaveLog('DistributedBorrowerComp', {
            cToken: mkt._address,
            borrower: a1,
            compDelta: etherUnsigned(25e18).toFixed(),
            compBorrowIndex: etherDouble(6).toFixed()
        });
    });

    it('should not transfer comp automatically', async () => {
        const mkt = cREP;
        await send(comptroller.comp, 'transfer', [distributor._address, etherUnsigned(50e18)], {from: root});
        await send(mkt, "harnessSetAccountBorrows", [a1, etherUnsigned(5.5e17), etherExp(1)]);
        await send(distributor, "setCompBorrowState", [mkt._address, etherDouble(1.0019), 10]);
        await send(distributor, "setCompBorrowerIndex", [mkt._address, a1, etherDouble(1)]);
        /*
            borrowerAmount = borrowBalance * 1e18 / borrow idx
                            = 5.5e17 * 1e18 / 1.1e18 = 5e17
            deltaIndex     = marketStoredIndex - userStoredIndex
                            = 1.0019e36 - 1e36 = 0.0019e36
            borrowerAccrued= borrowerAmount * deltaIndex / 1e36
                            = 5e17 * 0.0019e36 / 1e36 = 0.00095e18
            0.00095e18 < compClaimThreshold of 0.001e18
        */
        await send(distributor, "harnessDistributeBorrowerComp", [mkt._address, a1, etherExp(1.1)]);
        expect(await compAccrued(distributor, a1)).toEqualNumber(0.00095e18);
        expect(await compBalance(distributor, a1)).toEqualNumber(0);
    });

    /*it('should not revert or distribute when called with non-COMP market', async () => {
        const mkt = await makeCToken({
            comptroller: comptroller,
            supportMarket: true,
            addCompMarket: false,
    });

        await send(distributor, "harnessDistributeBorrowerComp", [mkt._address, a1, etherExp(1.1)]);
        expect(await compAccrued(distributor, a1)).toEqualNumber(0);
        expect(await compBalance(distributor, a1)).toEqualNumber(0);
        expect(await call(distributor, 'compBorrowerIndex', [mkt._address, a1])).toEqualNumber(compInitialIndex);
    });*/
});

describe('distributeSupplierComp()', () => {
    it('should transfer comp and update supply index correctly for first time user', async () => {
        const mkt = cREP;
        await send(distributor.comp, 'transfer', [distributor._address, etherUnsigned(50e18)], {from: root});

        await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e18)]);
        await send(distributor, "setCompSupplyState", [mkt._address, etherDouble(6), 10]);
        /*
        * 100 delta blocks, 10e18 total supply, 0.5e18 supplySpeed => 6e18 compSupplyIndex
        * confirming an acct with half the total supply over that time gets 25e18 COMP:
            supplierAmount  = 5e18
            deltaIndex      = marketStoredIndex - userStoredIndex
                            = 6e36 - 1e36 = 5e36
            suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                            = 5e18 * 5e36 / 1e36 = 25e18
        */

        const tx = await send(distributor, "harnessDistributeAllSupplierComp", [mkt._address, a1]);
        expect(await compAccrued(distributor, a1)).toEqualNumber(0);
        expect(await compBalance(distributor, a1)).toEqualNumber(25e18);
        expect(tx).toHaveLog('DistributedSupplierComp', {
            cToken: mkt._address,
            supplier: a1,
            compDelta: etherUnsigned(25e18).toFixed(),
            compSupplyIndex: etherDouble(6).toFixed()
        });
    });

    it('should update comp accrued and supply index for repeat user', async () => {
        const mkt = cREP;
        await send(distributor.comp, 'transfer', [distributor._address, etherUnsigned(50e18)], {from: root});

        await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e18)]);
        await send(distributor, "setCompSupplyState", [mkt._address, etherDouble(6), 10]);
        await send(distributor, "setCompSupplierIndex", [mkt._address, a1, etherDouble(2)]);
        /*
            supplierAmount  = 5e18
            deltaIndex      = marketStoredIndex - userStoredIndex
                            = 6e36 - 2e36 = 4e36
            suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                            = 5e18 * 4e36 / 1e36 = 20e18
        */

        await send(distributor, "harnessDistributeAllSupplierComp", [mkt._address, a1]);
        expect(await compAccrued(distributor, a1)).toEqualNumber(0);
        expect(await compBalance(distributor, a1)).toEqualNumber(20e18);
    });

    it('should not transfer when compAccrued below threshold', async () => {
        const mkt = cREP;
        await send(distributor.comp, 'transfer', [distributor._address, etherUnsigned(50e18)], {from: root});

        await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e17)]);
        await send(distributor, "setCompSupplyState", [mkt._address, etherDouble(1.0019), 10]);
        /*
            supplierAmount  = 5e17
            deltaIndex      = marketStoredIndex - userStoredIndex
                            = 1.0019e36 - 1e36 = 0.0019e36
            suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                            = 5e17 * 0.0019e36 / 1e36 = 0.00095e18
        */

        await send(distributor, "harnessDistributeSupplierComp", [mkt._address, a1]);
        expect(await compAccrued(distributor, a1)).toEqualNumber(0.00095e18);
        expect(await compBalance(distributor, a1)).toEqualNumber(0);
    });

    it('should not revert or distribute when called with non-COMP market', async () => {
        const mkt = await makeCToken({
            comptroller: comptroller,
            supportMarket: true,
            addCompMarket: false,
    });

        await send(distributor, "harnessDistributeSupplierComp", [mkt._address, a1]);
        expect(await compAccrued(distributor, a1)).toEqualNumber(0);
        expect(await compBalance(distributor, a1)).toEqualNumber(0);
        expect(await call(distributor, 'compBorrowerIndex', [mkt._address, a1])).toEqualNumber(0);
    });

});

describe('transferComp', () => {
    it('should transfer comp accrued when amount is above threshold', async () => {
        const compRemaining = 1000, a1AccruedPre = 100, threshold = 1;
        const compBalancePre = await compBalance(distributor, a1);
        const tx0 = await send(distributor.comp, 'transfer', [distributor._address, compRemaining], {from: root});
        const tx1 = await send(distributor, 'setCompAccrued', [a1, a1AccruedPre]);
        const tx2 = await send(distributor, 'harnessTransferComp', [a1, a1AccruedPre, threshold]);
        const a1AccruedPost = await compAccrued(distributor, a1);
        const compBalancePost = await compBalance(distributor, a1);
        expect(compBalancePre).toEqualNumber(0);
        expect(compBalancePost).toEqualNumber(a1AccruedPre);
    });

    it('should not transfer when comp accrued is below threshold', async () => {
        const compRemaining = 1000, a1AccruedPre = 100, threshold = 101;
        const compBalancePre = await call(distributor.comp, 'balanceOf', [a1]);
        const tx0 = await send(distributor.comp, 'transfer', [distributor._address, compRemaining], {from: root});
        const tx1 = await send(distributor, 'setCompAccrued', [a1, a1AccruedPre]);
        const tx2 = await send(distributor, 'harnessTransferComp', [a1, a1AccruedPre, threshold]);
        const a1AccruedPost = await compAccrued(distributor, a1);
        const compBalancePost = await compBalance(distributor, a1);
        expect(compBalancePre).toEqualNumber(0);
        expect(compBalancePost).toEqualNumber(0);
    });

    it('should not transfer comp if comp accrued is greater than comp remaining', async () => {
        const compRemaining = 99, a1AccruedPre = 100, threshold = 1;
        const compBalancePre = await compBalance(comptroller, a1);
        const tx0 = await send(distributor.comp, 'transfer', [distributor._address, compRemaining], {from: root});
        const tx1 = await send(distributor, 'setCompAccrued', [a1, a1AccruedPre]);
        const tx2 = await send(distributor, 'harnessTransferComp', [a1, a1AccruedPre, threshold]);
        const a1AccruedPost = await compAccrued(distributor, a1);
        const compBalancePost = await compBalance(distributor, a1);
        expect(compBalancePre).toEqualNumber(0);
        expect(compBalancePost).toEqualNumber(0);
    });
});

describe('claimRewards', () => {
    it('should accrue comp and then transfer comp accrued', async () => {
        const compRemaining = compRate.multipliedBy(100), mintAmount = etherUnsigned(12e18), deltaBlocks = 10;
        await send(distributor.comp, 'transfer', [distributor._address, compRemaining], {from: root});
        await pretendBorrow(cLOW, a1, 1, 1, 100);
        await send(distributor, '_setCompSpeeds', [[cLOW._address], [etherExp(0.5).toString()], [etherExp(0.5).toString()]]);
        await send(distributor, 'harnessRefreshCompSpeeds', [comptroller._address]);
        const supplySpeed = await call(distributor, 'compSupplySpeeds', [cLOW._address]);
        const borrowSpeed = await call(distributor, 'compBorrowSpeeds', [cLOW._address]);
        const a2AccruedPre = await compAccrued(distributor, a2);
        const compBalancePre = await compBalance(distributor, a2);
        await quickMint(cLOW, a2, mintAmount);
        await fastForward(distributor, deltaBlocks);
        const tx = await send(distributor, 'claimRewards', [a2]);
        const a2AccruedPost = await compAccrued(distributor, a2);
        const compBalancePost = await compBalance(distributor, a2);
        expect(tx.gasUsed).toBeLessThan(500000);
        expect(supplySpeed).toEqualNumber(compRate);
        expect(borrowSpeed).toEqualNumber(compRate);
        expect(a2AccruedPre).toEqualNumber(0);
        expect(a2AccruedPost).toEqualNumber(0);
        expect(compBalancePre).toEqualNumber(0);
        expect(compBalancePost).toEqualNumber(compRate.multipliedBy(deltaBlocks).minus(1)); // index is 8333...
    });

    it('should accrue comp and then transfer comp accrued in a single market', async () => {
        const compRemaining = compRate.multipliedBy(100), mintAmount = etherUnsigned(12e18), deltaBlocks = 10;
        await send(distributor.comp, 'transfer', [distributor._address, compRemaining], {from: root});
        await pretendBorrow(cLOW, a1, 1, 1, 100);
        await send(distributor, 'harnessAddCompMarkets', [[cLOW._address]]);
        await send(distributor, 'harnessRefreshCompSpeeds', [comptroller._address]);
        const supplySpeed = await call(distributor, 'compSupplySpeeds', [cLOW._address]);
        const borrowSpeed = await call(distributor, 'compBorrowSpeeds', [cLOW._address]);
        const a2AccruedPre = await compAccrued(distributor, a2);
        const compBalancePre = await compBalance(distributor, a2);
        await quickMint(cLOW, a2, mintAmount);
        await fastForward(distributor, deltaBlocks);
        const tx = await send(distributor, 'claimRewards', [a2, [cLOW._address]]);
        const a2AccruedPost = await compAccrued(distributor, a2);
        const compBalancePost = await compBalance(distributor, a2);
        expect(tx.gasUsed).toBeLessThan(220000);
        expect(supplySpeed).toEqualNumber(compRate);
        expect(borrowSpeed).toEqualNumber(compRate);
        expect(a2AccruedPre).toEqualNumber(0);
        expect(a2AccruedPost).toEqualNumber(0);
        expect(compBalancePre).toEqualNumber(0);
        expect(compBalancePost).toEqualNumber(compRate.multipliedBy(deltaBlocks).minus(1)); // index is 8333...
    });

    it('should claim when comp accrued is below threshold', async () => {
        const compRemaining = etherExp(1), accruedAmt = etherUnsigned(0.0009e18)
        await send(distributor.comp, 'transfer', [distributor._address, compRemaining], {from: root});
        await send(distributor, 'setCompAccrued', [a1, accruedAmt]);
        await send(distributor, 'claimRewards', [a1, [cLOW._address]]);
        expect(await compAccrued(distributor, a1)).toEqualNumber(0);
        expect(await compBalance(distributor, a1)).toEqualNumber(accruedAmt);
    });
});

describe('claimRewards batch', () => {
    it('should claim the expected amount when holders and ctokens arg is duplicated', async () => {
        const compRemaining = compRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10);
        await send(distributor.comp, 'transfer', [distributor._address, compRemaining], {from: root});
        let [_, __, ...claimAccts] = saddle.accounts;
        for(let from of claimAccts) {
            expect(await send(cLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
            send(cLOW.underlying, 'approve', [cLOW._address, mintAmount], { from });
            send(cLOW, 'mint', [mintAmount], { from });
        }
        await pretendBorrow(cLOW, root, 1, 1, etherExp(10));
        await send(distributor, 'harnessAddCompMarkets', [[cLOW._address]]);
        await send(distributor, 'harnessRefreshCompSpeeds', [comptroller._address]);

        await fastForward(distributor, deltaBlocks);

        const tx = await send(distributor, 'claimRewards', [[...claimAccts, ...claimAccts], [cLOW._address, cLOW._address], false, true]);
        // comp distributed => 10e18
        for(let acct of claimAccts) {
            expect(await call(distributor, 'compSupplierIndex', [cLOW._address, acct])).toEqualNumber(etherDouble(1.125));
            expect(await compBalance(distributor, acct)).toEqualNumber(etherExp(1.25));
        }
    });

    it('claims comp for multiple suppliers only', async () => {
        const compRemaining = compRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10);
        await send(distributor.comp, 'transfer', [distributor._address, compRemaining], {from: root});
        let [_, __, ...claimAccts] = saddle.accounts;
        for(let from of claimAccts) {
            expect(await send(cLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
            send(cLOW.underlying, 'approve', [cLOW._address, mintAmount], { from });
            send(cLOW, 'mint', [mintAmount], { from });
        }
        await pretendBorrow(cLOW, root, 1, 1, etherExp(10));
        await send(distributor, 'harnessAddCompMarkets', [[cLOW._address]]);
        await send(distributor, 'harnessRefreshCompSpeeds', [comptroller._address]);

        await fastForward(distributor, deltaBlocks);

        const tx = await send(distributor, 'claimRewards', [claimAccts, [cLOW._address], false, true]);
        // comp distributed => 10e18
        for(let acct of claimAccts) {
            expect(await call(distributor, 'compSupplierIndex', [cLOW._address, acct])).toEqualNumber(etherDouble(1.125));
            expect(await compBalance(distributor, acct)).toEqualNumber(etherExp(1.25));
        }
    });

    it('claims comp for multiple borrowers only, primes uninitiated', async () => {
        const compRemaining = compRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10), borrowAmt = etherExp(1), borrowIdx = etherExp(1)
        await send(distributor.comp, 'transfer', [distributor._address, compRemaining], {from: root});
        let [_,__, ...claimAccts] = saddle.accounts;

        for(let acct of claimAccts) {
            await send(cLOW, 'harnessIncrementTotalBorrows', [borrowAmt]);
            await send(cLOW, 'harnessSetAccountBorrows', [acct, borrowAmt, borrowIdx]);
        }
        await send(distributor, 'harnessAddCompMarkets', [[cLOW._address]]);
        await send(distributor, 'harnessRefreshCompSpeeds', [comptroller._address]);

        await send(distributor, 'harnessFastForward', [10]);

        const tx = await send(distributor, 'claimRewards', [claimAccts, [cLOW._address], true, false]);
        for(let acct of claimAccts) {
            expect(await call(distributor, 'compBorrowerIndex', [cLOW._address, acct])).toEqualNumber(etherDouble(2.25));
            expect(await call(distributor, 'compSupplierIndex', [cLOW._address, acct])).toEqualNumber(0);
        }
    });
});

describe('harnessRefreshCompSpeeds', () => {
    it('should start out 0', async () => {
        await send(distributor, 'harnessRefreshCompSpeeds', [comptroller._address]);
        const supplySpeed = await call(distributor, 'compSupplySpeeds', [cLOW._address]);
        const borrowSpeed = await call(distributor, 'compBorrowSpeeds', [cLOW._address]);
        expect(supplySpeed).toEqualNumber(0);
        expect(borrowSpeed).toEqualNumber(0);
    });

    it('should get correct speeds with borrows', async () => {
        await pretendBorrow(cLOW, a1, 1, 1, 100);
        await send(distributor, 'harnessAddCompMarkets', [[cLOW._address]]);
        const tx = await send(distributor, 'harnessRefreshCompSpeeds', [comptroller._address]);
        const supplySpeed = await call(distributor, 'compSupplySpeeds', [cLOW._address]);
        const borrowSpeed = await call(distributor, 'compBorrowSpeeds', [cLOW._address]);
        expect(supplySpeed).toEqualNumber(compRate);
        expect(borrowSpeed).toEqualNumber(compRate);
        expect(tx).toHaveLog(['CompBorrowSpeedUpdated', 0], {
            cToken: cLOW._address,
            newSpeed: borrowSpeed
        });
        expect(tx).toHaveLog(['CompSupplySpeedUpdated', 0], {
            cToken: cLOW._address,
            newSpeed: supplySpeed
        });
    });

    it('should get correct speeds for 2 assets', async () => {
        await pretendBorrow(cLOW, a1, 1, 1, 100);
        await pretendBorrow(cZRX, a1, 1, 1, 100);
        await send(distributor, 'harnessAddCompMarkets', [[cLOW._address, cZRX._address]]);
        await send(distributor, 'harnessRefreshCompSpeeds', [comptroller._address]);
        const supplySpeed1 = await call(distributor, 'compSupplySpeeds', [cLOW._address]);
        const borrowSpeed1 = await call(distributor, 'compBorrowSpeeds', [cLOW._address]);
        const supplySpeed2 = await call(distributor, 'compSupplySpeeds', [cREP._address]);
        const borrowSpeed2 = await call(distributor, 'compBorrowSpeeds', [cREP._address]);
        const supplySpeed3 = await call(distributor, 'compSupplySpeeds', [cZRX._address]);
        const borrowSpeed3 = await call(distributor, 'compBorrowSpeeds', [cZRX._address]);
        console.log(supplySpeed1, borrowSpeed1, supplySpeed2, borrowSpeed2, supplySpeed3, borrowSpeed3);
        expect(supplySpeed1).toEqualNumber(compRate.dividedBy(4));
        expect(borrowSpeed1).toEqualNumber(compRate.dividedBy(4));
        expect(supplySpeed2).toEqualNumber(0);
        expect(borrowSpeed2).toEqualNumber(0);
        expect(supplySpeed3).toEqualNumber(compRate.dividedBy(4).multipliedBy(3));
        expect(borrowSpeed3).toEqualNumber(compRate.dividedBy(4).multipliedBy(3));
    });
});

describe('harnessSetCompSpeeds', () => {
    it('should correctly set differing COMP supply and borrow speeds', async () => {
        const desiredCompSupplySpeed = 3;
        const desiredCompBorrowSpeed = 20;
        await send(distributor, 'harnessAddCompMarkets', [[cLOW._address]]);
        const tx = await send(distributor, '_setCompSpeeds', [[cLOW._address], [desiredCompSupplySpeed], [desiredCompBorrowSpeed]]);
        expect(tx).toHaveLog(['CompBorrowSpeedUpdated', 0], {
            cToken: cLOW._address,
            newSpeed: desiredCompBorrowSpeed
        });
        expect(tx).toHaveLog(['CompSupplySpeedUpdated', 0], {
            cToken: cLOW._address,
            newSpeed: desiredCompSupplySpeed
        });
        const currentCompSupplySpeed = await call(distributor, 'compSupplySpeeds', [cLOW._address]);
        const currentCompBorrowSpeed = await call(distributor, 'compBorrowSpeeds', [cLOW._address]);
        expect(currentCompSupplySpeed).toEqualNumber(desiredCompSupplySpeed);
        expect(currentCompBorrowSpeed).toEqualNumber(desiredCompBorrowSpeed);
    });

    it('should correctly get differing COMP supply and borrow speeds for 4 assets', async () => {
        const cBAT = await makeCToken({ comptroller, supportMarket: true });
        const cDAI = await makeCToken({ comptroller, supportMarket: true });

        const borrowSpeed1 = 5;
        const supplySpeed1 = 10;

        const borrowSpeed2 = 0;
        const supplySpeed2 = 100;

        const borrowSpeed3 = 0;
        const supplySpeed3 = 0;

        const borrowSpeed4 = 13;
        const supplySpeed4 = 0;

        await send(distributor, 'harnessAddCompMarkets', [[cREP._address, cZRX._address, cBAT._address, cDAI._address]]);
        await send(distributor, '_setCompSpeeds', [[cREP._address, cZRX._address, cBAT._address, cDAI._address], [supplySpeed1, supplySpeed2, supplySpeed3, supplySpeed4], [borrowSpeed1, borrowSpeed2, borrowSpeed3, borrowSpeed4]]);

        const currentSupplySpeed1 = await call(distributor, 'compSupplySpeeds', [cREP._address]);
        const currentBorrowSpeed1 = await call(distributor, 'compBorrowSpeeds', [cREP._address]);
        const currentSupplySpeed2 = await call(distributor, 'compSupplySpeeds', [cZRX._address]);
        const currentBorrowSpeed2 = await call(distributor, 'compBorrowSpeeds', [cZRX._address]);
        const currentSupplySpeed3 = await call(distributor, 'compSupplySpeeds', [cBAT._address]);
        const currentBorrowSpeed3 = await call(distributor, 'compBorrowSpeeds', [cBAT._address]);
        const currentSupplySpeed4 = await call(distributor, 'compSupplySpeeds', [cDAI._address]);
        const currentBorrowSpeed4 = await call(distributor, 'compBorrowSpeeds', [cDAI._address]);

        expect(currentSupplySpeed1).toEqualNumber(supplySpeed1);
        expect(currentBorrowSpeed1).toEqualNumber(borrowSpeed1);
        expect(currentSupplySpeed2).toEqualNumber(supplySpeed2);
        expect(currentBorrowSpeed2).toEqualNumber(borrowSpeed2);
        expect(currentSupplySpeed3).toEqualNumber(supplySpeed3);
        expect(currentBorrowSpeed3).toEqualNumber(borrowSpeed3);
        expect(currentSupplySpeed4).toEqualNumber(supplySpeed4);
        expect(currentBorrowSpeed4).toEqualNumber(borrowSpeed4);
    });

    const checkAccrualsBorrowAndSupply = async (compSupplySpeed, compBorrowSpeed) => {
        const mintAmount = etherUnsigned(1000e18), borrowAmount = etherUnsigned(1e18), borrowCollateralAmount = etherUnsigned(1000e18), compRemaining = compRate.multipliedBy(100), deltaBlocks = 10;

        // Transfer COMP to the comptroller
        await send(distributor.comp, 'transfer', [distributor._address, compRemaining], {from: root});

        // Setup comptroller
        await send(distributor, 'harnessAddCompMarkets', [[cLOW._address, cUSD._address]]);

        // Set comp speeds to 0 while we setup
        await send(distributor, '_setCompSpeeds', [[cLOW._address, cUSD._address], [0, 0], [0, 0]]);

        // a2 - supply
        await quickMint(cLOW, a2, mintAmount); // a2 is the supplier

        // a1 - borrow (with supplied collateral)
        await quickMint(cUSD, a1, borrowCollateralAmount);
        await enterMarkets([cUSD], a1);
        await quickBorrow(cLOW, a1, borrowAmount); // a1 is the borrower

        // Initialize comp speeds
        await send(distributor, '_setCompSpeeds', [[cLOW._address], [compSupplySpeed.toString()], [compBorrowSpeed.toString()]]);

        // Get initial COMP balances
        const a1TotalCompPre = await totalCompAccrued(distributor, a1);
        const a2TotalCompPre = await totalCompAccrued(distributor, a2);

        // Start off with no COMP accrued and no COMP balance
        expect(a1TotalCompPre).toEqualNumber(0);
        expect(a2TotalCompPre).toEqualNumber(0);

        // Fast forward blocks
        await fastForward(distributor, deltaBlocks);

        // Accrue COMP
        await send(distributor, 'claimRewards', [[a1, a2], [cLOW._address], true, true]);

        // Get accrued COMP balances
        const a1TotalCompPost = await totalCompAccrued(distributor, a1);
        const a2TotalCompPost = await totalCompAccrued(distributor, a2);

        // check accrual for borrow
        expect(a1TotalCompPost).toEqualNumber(Number(compBorrowSpeed) > 0 ? compBorrowSpeed.multipliedBy(deltaBlocks).minus(1) : 0);

        // check accrual for supply
        expect(a2TotalCompPost).toEqualNumber(Number(compSupplySpeed) > 0 ? compSupplySpeed.multipliedBy(deltaBlocks) : 0);
    };

    it('should accrue comp correctly with only supply-side rewards', async () => {
        await checkAccrualsBorrowAndSupply(/* supply speed */ etherExp(0.5), /* borrow speed */ 0);
    });

    it('should accrue comp correctly with only borrow-side rewards', async () => {
        await checkAccrualsBorrowAndSupply(/* supply speed */ 0, /* borrow speed */ etherExp(0.5));
    });
});

describe('harnessAddCompMarkets', () => {
    it('should correctly add a comp market if called by admin', async () => {
        const cBAT = await makeCToken({comptroller, supportMarket: true});
        const tx1 = await send(distributor, 'harnessAddCompMarkets', [[cLOW._address, cREP._address, cZRX._address]]);
        const tx2 = await send(distributor, 'harnessAddCompMarkets', [[cBAT._address]]);
        const markets = await call(comptroller, 'getCompMarkets');
        expect(markets).toEqual([cLOW, cREP, cZRX, cBAT].map((c) => c._address));
        expect(tx2).toHaveLog('CompBorrowSpeedUpdated', {
            cToken: cBAT._address,
            newSpeed: 1
        });
        expect(tx2).toHaveLog('CompSupplySpeedUpdated', {
            cToken: cBAT._address,
            newSpeed: 1
        });
    });

    it('should not write over a markets existing state', async () => {
        const mkt = cLOW._address;
        const bn0 = 10, bn1 = 20;
        const idx = etherUnsigned(1.5e36);

        await send(distributor, "harnessAddCompMarkets", [[mkt]]);
        await send(distributor, "setCompSupplyState", [mkt, idx, bn0]);
        await send(distributor, "setCompBorrowState", [mkt, idx, bn0]);
        await send(distributor, "setBlockNumber", [bn1]);
        await send(distributor, "_setCompSpeeds", [[mkt], [0], [0]]);
        await send(distributor, "harnessAddCompMarkets", [[mkt]]);

        const supplyState = await call(distributor, 'compSupplyState', [mkt]);
        expect(supplyState.block).toEqual(bn1.toString());
        expect(supplyState.index).toEqual(idx.toFixed());

        const borrowState = await call(distributor, 'compBorrowState', [mkt]);
        expect(borrowState.block).toEqual(bn1.toString());
        expect(borrowState.index).toEqual(idx.toFixed());
    });
});

describe('updateContributorRewards', () => {
    it('should not fail when contributor rewards called on non-contributor', async () => {
        const tx1 = await send(distributor, 'updateContributorRewards', [a1]);
    });

    it('should accrue comp to contributors', async () => {
        const tx1 = await send(distributor, '_setContributorCompSpeed', [a1, 2000]);
        await fastForward(distributor, 50);

        const a1Accrued = await compAccrued(distributor, a1);
        expect(a1Accrued).toEqualNumber(0);

        const tx2 = await send(distributor, 'updateContributorRewards', [a1], {from: a1});
        const a1Accrued2 = await compAccrued(distributor, a1);
        expect(a1Accrued2).toEqualNumber(50 * 2000);
        });

        it('should accrue comp with late set', async () => {
        await fastForward(distributor, 1000);
        const tx1 = await send(distributor, '_setContributorCompSpeed', [a1, 2000]);
        await fastForward(distributor, 50);

        const tx2 = await send(distributor, 'updateContributorRewards', [a1], {from: a1});
        const a1Accrued2 = await compAccrued(distributor, a1);
        expect(a1Accrued2).toEqualNumber(50 * 2000);
    });
});

describe('_setContributorCompSpeed', () => {
    it('should revert if not called by admin', async () => {
    await expect(
        send(distributor, '_setContributorCompSpeed', [a1, 1000], {from: a1})
        ).rejects.toRevert('revert only admin can set comp speed');
    });

    it('should start comp stream if called by admin', async () => {
    const tx = await send(distributor, '_setContributorCompSpeed', [a1, 1000]);
    expect(tx).toHaveLog('ContributorCompSpeedUpdated', {
        contributor: a1,
        newSpeed: 1000
    });
    });

    it('should reset comp stream if set to 0', async () => {
        const tx1 = await send(distributor, '_setContributorCompSpeed', [a1, 2000]);
        await fastForward(distributor, 50);

        const tx2 = await send(distributor, '_setContributorCompSpeed', [a1, 0]);
        await fastForward(distributor, 50);

        const tx3 = await send(distributor, 'updateContributorRewards', [a1], {from: a1});
        const a1Accrued = await compAccrued(distributor, a1);
        expect(a1Accrued).toEqualNumber(50 * 2000);
        });
    });
});
