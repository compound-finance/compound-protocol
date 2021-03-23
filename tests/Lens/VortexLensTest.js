const {
  address,
  encodeParameters,
} = require('../Utils/Ethereum');
const {
  makeController,
  makeVToken,
} = require('../Utils/Vortex');

function cullTuple(tuple) {
  return Object.keys(tuple).reduce((acc, key) => {
    if (Number.isNaN(Number(key))) {
      return {
        ...acc,
        [key]: tuple[key]
      };
    } else {
      return acc;
    }
  }, {});
}

describe('VortexLens', () => {
  let vortexLens;
  let acct;

  beforeEach(async () => {
    vortexLens = await deploy('VortexLens');
    acct = accounts[0];
  });

  describe('vTokenMetadata', () => {
    it('is correct for a vErc20', async () => {
      let vErc20 = await makeVToken();
      expect(
        cullTuple(await call(vortexLens, 'vTokenMetadata', [vErc20._address]))
      ).toEqual(
        {
          vToken: vErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed:false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(vErc20, 'underlying', []),
          vTokenDecimals: "8",
          underlyingDecimals: "18"
        }
      );
    });

    it('is correct for vEth', async () => {
      let vEth = await makeVToken({kind: 'vether'});
      expect(
        cullTuple(await call(vortexLens, 'vTokenMetadata', [vEth._address]))
      ).toEqual({
        borrowRatePerBlock: "0",
        vToken: vEth._address,
        vTokenDecimals: "8",
        collateralFactorMantissa: "0",
        exchangeRateCurrent: "1000000000000000000",
        isListed: false,
        reserveFactorMantissa: "0",
        supplyRatePerBlock: "0",
        totalBorrows: "0",
        totalCash: "0",
        totalReserves: "0",
        totalSupply: "0",
        underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
        underlyingDecimals: "18",
      });
    });
  });

  describe('vTokenMetadataAll', () => {
    it('is correct for a vErc20 and vEther', async () => {
      let vErc20 = await makeVToken();
      let vEth = await makeVToken({kind: 'vether'});
      expect(
        (await call(vortexLens, 'vTokenMetadataAll', [[vErc20._address, vEth._address]])).map(cullTuple)
      ).toEqual([
        {
          vToken: vErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed:false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(vErc20, 'underlying', []),
          vTokenDecimals: "8",
          underlyingDecimals: "18"
        },
        {
          borrowRatePerBlock: "0",
          vToken: vEth._address,
          vTokenDecimals: "8",
          collateralFactorMantissa: "0",
          exchangeRateCurrent: "1000000000000000000",
          isListed: false,
          reserveFactorMantissa: "0",
          supplyRatePerBlock: "0",
          totalBorrows: "0",
          totalCash: "0",
          totalReserves: "0",
          totalSupply: "0",
          underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
          underlyingDecimals: "18",
        }
      ]);
    });
  });

  describe('vTokenBalances', () => {
    it('is correct for vERC20', async () => {
      let vErc20 = await makeVToken();
      expect(
        cullTuple(await call(vortexLens, 'vTokenBalances', [vErc20._address, acct]))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          vToken: vErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        }
      );
    });

    it('is correct for vETH', async () => {
      let vEth = await makeVToken({kind: 'vether'});
      let ethBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(await call(vortexLens, 'vTokenBalances', [vEth._address, acct], {gasPrice: '0'}))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          vToken: vEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      );
    });
  });

  describe('vTokenBalancesAll', () => {
    it('is correct for vEth and vErc20', async () => {
      let vErc20 = await makeVToken();
      let vEth = await makeVToken({kind: 'vether'});
      let ethBalance = await web3.eth.getBalance(acct);
      
      expect(
        (await call(vortexLens, 'vTokenBalancesAll', [[vErc20._address, vEth._address], acct], {gasPrice: '0'})).map(cullTuple)
      ).toEqual([
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          vToken: vErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        },
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          vToken: vEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      ]);
    })
  });

  describe('vTokenUnderlyingPrice', () => {
    it('gets correct price for vErc20', async () => {
      let vErc20 = await makeVToken();
      expect(
        cullTuple(await call(vortexLens, 'vTokenUnderlyingPrice', [vErc20._address]))
      ).toEqual(
        {
          vToken: vErc20._address,
          underlyingPrice: "0",
        }
      );
    });

    it('gets correct price for vEth', async () => {
      let vEth = await makeVToken({kind: 'vether'});
      expect(
        cullTuple(await call(vortexLens, 'vTokenUnderlyingPrice', [vEth._address]))
      ).toEqual(
        {
          vToken: vEth._address,
          underlyingPrice: "1000000000000000000",
        }
      );
    });
  });

  describe('vTokenUnderlyingPriceAll', () => {
    it('gets correct price for both', async () => {
      let vErc20 = await makeVToken();
      let vEth = await makeVToken({kind: 'vether'});
      expect(
        (await call(vortexLens, 'vTokenUnderlyingPriceAll', [[vErc20._address, vEth._address]])).map(cullTuple)
      ).toEqual([
        {
          vToken: vErc20._address,
          underlyingPrice: "0",
        },
        {
          vToken: vEth._address,
          underlyingPrice: "1000000000000000000",
        }
      ]);
    });
  });

  describe('getAccountLimits', () => {
    it('gets correct values', async () => {
      let controller = await makeController();

      expect(
        cullTuple(await call(vortexLens, 'getAccountLimits', [controller._address, acct]))
      ).toEqual({
        liquidity: "0",
        markets: [],
        shortfall: "0"
      });
    });
  });

  describe('governance', () => {
    let vtx, gov;
    let targets, values, signatures, callDatas;
    let proposalBlock, proposalId;

    beforeEach(async () => {
      vtx = await deploy('Vtx', [acct]);
      gov = await deploy('GovernorAlpha', [address(0), vtx._address, address(0)]);
      targets = [acct];
      values = ["0"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [acct])];
      await send(vtx, 'delegate', [acct]);
      await send(gov, 'propose', [targets, values, signatures, callDatas, "do nothing"]);
      proposalBlock = +(await web3.eth.getBlockNumber());
      proposalId = await call(gov, 'latestProposalIds', [acct]);
    });

    describe('getGovReceipts', () => {
      it('gets correct values', async () => {
        expect(
          (await call(vortexLens, 'getGovReceipts', [gov._address, acct, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            hasVoted: false,
            proposalId: proposalId,
            support: false,
            votes: "0",
          }
        ]);
      })
    });

    describe('getGovProposals', () => {
      it('gets correct values', async () => {
        expect(
          (await call(vortexLens, 'getGovProposals', [gov._address, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            againstVotes: "0",
            calldatas: callDatas,
            canceled: false,
            endBlock: (Number(proposalBlock) + 17281).toString(),
            eta: "0",
            executed: false,
            forVotes: "0",
            proposalId: proposalId,
            proposer: acct,
            signatures: signatures,
            startBlock: (Number(proposalBlock) + 1).toString(),
            targets: targets
          }
        ]);
      })
    });
  });

  describe('vtx', () => {
    let vtx, currentBlock;

    beforeEach(async () => {
      currentBlock = +(await web3.eth.getBlockNumber());
      vtx = await deploy('Vtx', [acct]);
    });

    describe('getVtxBalanceMetadata', () => {
      it('gets correct values', async () => {
        expect(
          cullTuple(await call(vortexLens, 'getVtxBalanceMetadata', [vtx._address, acct]))
        ).toEqual({
          balance: "10000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
        });
      });
    });

    describe('getVtxBalanceMetadataExt', () => {
      it('gets correct values', async () => {
        let controller = await makeController();
        await send(controller, 'setVtxAccrued', [acct, 5]); // harness only

        expect(
          cullTuple(await call(vortexLens, 'getVtxBalanceMetadataExt', [vtx._address, controller._address, acct]))
        ).toEqual({
          balance: "10000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
          allocated: "5"
        });
      });
    });

    describe('getVtxVotes', () => {
      it('gets correct values', async () => {
        expect(
          (await call(vortexLens, 'getVtxVotes', [vtx._address, acct, [currentBlock, currentBlock - 1]])).map(cullTuple)
        ).toEqual([
          {
            blockNumber: currentBlock.toString(),
            votes: "0",
          },
          {
            blockNumber: (Number(currentBlock) - 1).toString(),
            votes: "0",
          }
        ]);
      });

      it('reverts on future value', async () => {
        await expect(
          call(vortexLens, 'getVtxVotes', [vtx._address, acct, [currentBlock + 1]])
        ).rejects.toRevert('revert Vtx::getPriorVotes: not yet determined')
      });
    });
  });
});
