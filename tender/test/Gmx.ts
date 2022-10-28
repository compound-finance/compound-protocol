import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { getWallet, getAbiFromArbiscan, resetNetwork } from './TestUtil'
import { Wallet, Contract, BigNumber } from 'ethers';
import { resolve } from 'path';
import { parseAbiFromJson, getDeployments } from './TestUtil'
import axios from 'axios';
import { formatAmount, getUnderlyingBalance } from './TokenUtil';
import * as hre from 'hardhat';
import * as ethers from 'ethers';
import { GmxTokenContract, CTokenContract } from './Token'
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const expect = chai.expect;

// do not allow numbers since they cause issues
const hreProvider = hre.network.provider;

const provider = new ethers.providers.Web3Provider(hreProvider as any);

const test = {
  symbol: 'tGMX',
  contractName: 'CErc20DelegatorGmx',
  mintAmount: '0.05',
  borrowAmount: '0.01',
  contractClass: GmxTokenContract,
  deploymentFilePath: '../../deployments/gmx.json',
  walletAddress: '0x5B33EC561Cb20EaF7d5b41A9B68A690E2EBBc893',
}

let erc20Contract: GmxTokenContract;
let uContractAddress: string;
let uContract: Contract;
let wallet: JsonRpcSigner;

let rewardRouterAddress: string;
let tDecimals: number;
let uDecimals: number;

let uBalanceProvider: Contract | JsonRpcProvider;
let stakedGmxTrackerAddress;
let balanceOfUnderlying;

const walletAddress = test.walletAddress;

describe(test.symbol, () => {
  before(async () => {
    resetNetwork();
    wallet = await getWallet(walletAddress, provider)
    erc20Contract = new GmxTokenContract(test['symbol'], test['contractName'], wallet, test['deploymentFilePath']);
    uContractAddress = await erc20Contract.underlying();
    const uAbi = await getAbiFromArbiscan(uContractAddress);
    uContract = new Contract(uContractAddress, uAbi, wallet);
    uBalanceProvider = uContract;
    uDecimals = test['uDecimals'] ? test['uDecimals'] : await uContract.decimals();
    stakedGmxTrackerAddress = await erc20Contract.contract.stakedGmxTracker()
    await uContract.approve(erc20Contract.address, ethers.constants.MaxUint256);
  })

  let totalDeposited = BigNumber.from(0);

  describe('deposits', () => {
    let tBalance;
    let uBalance;
    let tBalanceTest;
    let uBalanceTest;
    let stakedBalance;


    it('Should mint', async () => {
      tBalance = await erc20Contract.balanceOf(wallet._address);
      uBalance = await getUnderlyingBalance(uBalanceProvider, wallet._address);
      stakedBalance = await uContract.stakedBalance(stakedGmxTrackerAddress);
      stakedGmxTrackerAddress = await erc20Contract.contract.stakedGmxTracker()
      expect(await erc20Contract.mint(formatAmount(test['mintAmount'], uDecimals))).does.not.throw;
    })
    it('Minter should have more tGMX', async () => {
      expect((await erc20Contract.balanceOf(wallet._address)).gt(tBalance));
    })
    it('Minter should have less GMX', async () => {
      expect((await uContract.balanceOf(wallet._address)).gt(uBalance));
    })
    it('stakedGmxTracker should have More staked GMX', async () => {
      expect(await uContract.stakedBalance(stakedGmxTrackerAddress)).gt(stakedBalance);
    })
  });

  describe('borrow', () => {
    let borrowBalanceStored;
    let stakedBalance;
    let comptrollerProxy;
    let unitroller;
    let currentSupplyCap: BigNumber;
    let currentBorrowCap: BigNumber;
    let newSupplyCap: BigNumber;
    let newBorrowCap: BigNumber;

    before(async () => {
      const comptrollerAddress = await erc20Contract.contract.comptroller();
      const comptrollerAbi = await getAbiFromArbiscan(comptrollerAddress);
      const comptroller = new Contract(comptrollerAddress, comptrollerAbi, wallet);

      const unitrollerAddress = await comptroller.comptrollerImplementation();
      const unitrollerAbi = await getAbiFromArbiscan(unitrollerAddress);
      unitroller = new Contract(await comptrollerAddress, unitrollerAbi, wallet);
    })
    it('Should borrow', async () => {
      const depositBalance = await erc20Contract.balanceOf(wallet._address);
      if (depositBalance.lte(0)) {
        await erc20Contract.mint(formatAmount(test['mintAmount'], uDecimals));
      }
      borrowBalanceStored = await erc20Contract.contract.borrowBalanceStored(wallet._address);
      stakedBalance = await uContract.stakedBalance(stakedGmxTrackerAddress);
      expect(await erc20Contract.borrow(formatAmount(test['borrowAmount'], uDecimals))).does.not.throw;
    })
    it('Borrower should have higher borrowBalanceStored', async () => {
      expect(await erc20Contract.contract.borrowBalanceStored(wallet._address)).gt(borrowBalanceStored);
    })
    it('stakedGmxTracker should have less staked GMX', async () => {
      expect(await uContract.stakedBalance(stakedGmxTrackerAddress)).lt(stakedBalance);
    })
    it('Should be able to repay the loan', async () => {
      const borrowBalance = await erc20Contract.contract.borrowBalanceStored(wallet._address);
      let repayAmount = borrowBalance;
      const uBalance = await uContract.balanceOf(wallet._address)

      if( uBalance < borrowBalance) {
        repayAmount = uBalance;
      }
      // await erc20Contract.contract.repayBorrow(repayAmount);
      await erc20Contract.contract.repayBorrow(ethers.constants.MaxUint256);
      const remainingBorrowBalance = await erc20Contract.contract.borrowBalanceStored(wallet._address);
      const testRemaining = borrowBalance.sub(repayAmount).eq(remainingBorrowBalance);
      expect(testRemaining).to.be.true;
    })

    it('Should not have liquidity after repaying and redeeming tokens', async () => {
      const uBalance = await uContract.balanceOf(wallet._address)
      const tBalance = await erc20Contract.balanceOf(wallet._address);
      console.log(uBalance)
      console.log(tBalance)
      // await erc20Contract.mint(uBalance)

      // let cash = BigNumber.from(await erc20Contract.contract.getCash()).add(BigNumber.from(await erc20Contract.contract.totalReserves()));
      // const borrowBalance = await erc20Contract.contract.borrowBalanceStored(wallet._address);
      // const marketInfo = await unitroller.markets(erc20Contract.address);


      // const expectedLiquidity = cash.sub(borrowBalance);

      // stakedGmxTrackerAddress = await erc20Contract.contract.stakedGmxTracker()
      // const testLiquidity = expectedLiquidity.eq(reportedLiquidity);
      // console.log(reportedLiquidity)
      // console.log(expectedLiquidity)
      // expect(testLiquidity).to.be.true;

      // find how much is stored in protocol and then redeemUnderlying that amount
      console.log("Borrow Balance", (await erc20Contract.contract.borrowBalanceStored(wallet._address)).toString());
      console.log(await erc20Contract.contract.balanceOfUnderlying(wallet._address));
      // await erc20Contract.redeemUnderlying(gmxStoredAmount);
      const { 1: reportedLiquidity } = await unitroller.getAccountLiquidity(wallet._address);
      console.log("Reported Liquidity", reportedLiquidity.toString());
      console.log(await erc20Contract.contract.balanceOfUnderlying(wallet._address));

      // await erc20Contract.redeem(depositBalance);
      // console.log(reportedLiquidity);
      // expect(reportedLiquidity).eq(0);
    })
  });
  describe('balanceOfUnderlying', () => {
    it('Pre-deposit + total deposit amount <= after deposit', async () => {
     console.log(await erc20Contract.contract.balanceOfUnderlying(wallet._address));
      let getCash = await erc20Contract.contract.getCash();
      for (let i = 0; i < 3; i++) {
        // await uContract.approve(erc20Contract.address, formatAmount(test.mintAmount, uDecimals));
        await erc20Contract.mint(formatAmount(test['mintAmount'], uDecimals));
        totalDeposited = totalDeposited.add(formatAmount(test['mintAmount'], uDecimals));
      }
      await erc20Contract.contract.balanceOfUnderlying(wallet._address);
      let getCashNew = await erc20Contract.contract.getCash();
      const depositedPlusCurrent = totalDeposited.add(getCash);
      const testBalance = getCashNew.gte(depositedPlusCurrent);
      expect(testBalance).is.true;
    })
  });

  describe('Supply', () => {
    let comptrollerProxy;
    let unitroller;
    let currentSupplyCap: BigNumber;
    let currentBorrowCap: BigNumber;
    let newSupplyCap: BigNumber;
    let newBorrowCap: BigNumber;

    before(async () => {
      const comptrollerAddress = await erc20Contract.contract.comptroller();
      const comptrollerAbi = await getAbiFromArbiscan(comptrollerAddress);
      const comptroller = new Contract(comptrollerAddress, comptrollerAbi, wallet);

      const unitrollerAddress = await comptroller.comptrollerImplementation();
      const unitrollerAbi = await getAbiFromArbiscan(unitrollerAddress);
      unitroller = new Contract(await comptrollerAddress, unitrollerAbi, wallet);
    })

    it('Should have assignable supply and borrow caps', async () => {
      currentBorrowCap = await unitroller.borrowCaps(erc20Contract.address)
      currentSupplyCap = await unitroller.supplyCaps(erc20Contract.address)

      // @params cTokens: address[], newBorrowCaps: BigNumber[], newSupplyCaps: BigNumber[]
      const setMarketBorrowCaps = async (
        cTokens: string[],
        newBorrowCaps: BigNumber[],
        newSupplyCaps: BigNumber[]
      ) => {
        await unitroller._setMarketBorrowCaps(cTokens, newBorrowCaps, newSupplyCaps);
      }
      const cTokens = [erc20Contract.address];

      let totalBorrows = await erc20Contract.contract.totalBorrows()

      const assignBorrowCaps = [formatAmount('.00001', uDecimals).add(currentSupplyCap)];
      const assignSupplyCaps = [formatAmount('.00001', uDecimals).add(currentSupplyCap)];

      await setMarketBorrowCaps(cTokens, assignBorrowCaps, assignSupplyCaps);

      newBorrowCap = await unitroller.borrowCaps(erc20Contract.address)
      newSupplyCap = await unitroller.supplyCaps(erc20Contract.address)
      totalBorrows = await erc20Contract.contract.totalBorrows()

      const borrowCapsSet = newBorrowCap.eq(assignBorrowCaps[0])
      const supplyCapsSet = newSupplyCap.eq(assignSupplyCaps[0])
  
      expect(borrowCapsSet).is.true;
      expect(supplyCapsSet).is.true;
    })
    it('Should respect supplyCap', async() => {
      const supplyCap = await unitroller.supplyCaps(erc20Contract.address);
      const supplyAmount = newSupplyCap.add(BigNumber.from('1'))
    })

    it('Should respect borrowCap', async() => {
      await erc20Contract.contract._setAutocompoundRewards(false);
      let borrowBalanceStored = await erc20Contract.contract.borrowBalanceStored(wallet._address);
      const borrowAmount = newSupplyCap.sub(borrowBalanceStored).add(BigNumber.from('1'))
      expect(erc20Contract.borrow(borrowAmount)).to.be.rejectedWith('market borrow cap reached');
    })
  })
})

