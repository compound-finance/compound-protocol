import {
  JsonRpcSigner,
  JsonRpcProvider,
  ExternalProvider,
} from "@ethersproject/providers";
import { getWallet, getAbiFromArbiscan, resetNetwork } from "./utils/TestUtil";
import { Wallet, Contract, BigNumber } from "ethers";
import { resolve } from "path";
import { parseAbiFromJson, getDeployments } from "./utils/TestUtil";
import axios from "axios";
import { formatAmount } from "./utils/TokenUtil";
import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import { GmxTokenContract, CTokenContract } from "./contract_helpers/Token";
import chai from "chai";
import chaiBN from "chai-bn";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
chai.use(chaiBN(BigNumber));
const expect = chai.expect;

// do not allow numbers since they cause issues
const provider = ethers.provider;

const test = {
  symbol: "tGMX",
  contractName: "CErc20DelegatorGmx",
  mintAmount: "0.05",
  borrowAmount: "0.01",
  contractClass: GmxTokenContract,
  deploymentFile: "gmx",
  walletAddress: "0x5B33EC561Cb20EaF7d5b41A9B68A690E2EBBc893",
  adminAddress: "0x85abbc0f8681c4fb33b6a3a601ad99e92a32d1ac",
  proxyAddress: "0x3d05beBcB962f8e873dE167B161F987e51Dd1281",
};

let cTokenContract: GmxTokenContract;
let uContractAddress: string;
let uContract: Contract;
let wallet: JsonRpcSigner;

let rewardRouterAddress: string;
let tDecimals: number;
let uDecimals: number;

let uBalanceProvider: Contract | JsonRpcProvider;
let stakedGmxTrackerAddress;
let balanceOfUnderlying;
let admin;
let cTokenAdminContract;

let { adminAddress, walletAddress } = test;

describe(test.symbol, () => {
  before(async () => {
    await resetNetwork();
    wallet = await getWallet(walletAddress, provider);
    admin = await getWallet(adminAddress, provider);
    cTokenContract = new GmxTokenContract(
      test["symbol"],
      test["contractName"],
      wallet,
      test["deploymentFile"]
    );

    uContractAddress = await cTokenContract.underlying();
    const uAbi = await getAbiFromArbiscan(uContractAddress);
    uContract = new Contract(uContractAddress, uAbi, wallet);
    uBalanceProvider = uContract;
    uDecimals = test["uDecimals"]
      ? test["uDecimals"]
      : await uContract.decimals();
    stakedGmxTrackerAddress = await cTokenContract.contract.stakedGmxTracker();
    await uContract.approve(
      cTokenContract.address,
      ethers.constants.MaxUint256
    );
  });

  let totalDeposited = BigNumber.from(0);

  describe("deposits", () => {
    let tBalance;
    let uBalance;
    let tBalanceTest;
    let uBalanceTest;
    let stakedBalance;

    it("Should mint", async () => {
      tBalance = await cTokenContract.balanceOf(wallet._address);
      uBalance = await cTokenContract.getUnderlyingBalance(wallet._address);
      stakedBalance = await uContract.stakedBalance(stakedGmxTrackerAddress);
      stakedGmxTrackerAddress = await cTokenContract.contract.stakedGmxTracker();
      expect(
        await cTokenContract.mint(formatAmount(test["mintAmount"], uDecimals))
      ).does.not.throw;
    });
    it("Minter should have more tGMX", async () => {
      expect((await cTokenContract.balanceOf(wallet._address)).gt(tBalance)).to
        .be.true;
    });
    it("Minter should have less GMX", async () => {
      const uBalanceTest = (
        await cTokenContract.getUnderlyingBalance(wallet._address)
      ).lt(uBalance);
      expect(uBalanceTest).to.be.true;
    });
    it("stakedGmxTracker should have More staked GMX", async () => {
      expect(
        await uContract.stakedBalance(stakedGmxTrackerAddress)
      ).to.be.a.bignumber.gt(stakedBalance);
    });
  });

  describe("borrow", () => {
    let borrowBalanceStored;
    let stakedBalance;
    let comptrollerProxy;
    let unitroller;
    let currentSupplyCap: BigNumber;
    let currentBorrowCap: BigNumber;
    let newSupplyCap: BigNumber;
    let newBorrowCap: BigNumber;

    before(async () => {
      const comptrollerAddress = await cTokenContract.contract.comptroller();
      const comptrollerAbi = await getAbiFromArbiscan(comptrollerAddress);
      const comptroller = new Contract(
        comptrollerAddress,
        comptrollerAbi,
        wallet
      );

      const unitrollerAddress = await comptroller.comptrollerImplementation();
      const unitrollerAbi = await getAbiFromArbiscan(unitrollerAddress);
      unitroller = new Contract(
        await comptrollerAddress,
        unitrollerAbi,
        wallet
      );
    });
    it("Should borrow", async () => {
      const depositBalance = await cTokenContract.balanceOf(wallet._address);
      if (depositBalance.lte(0)) {
        await cTokenContract.mint(formatAmount(test["mintAmount"], uDecimals));
      }
      borrowBalanceStored = await cTokenContract.contract.borrowBalanceStored(
        wallet._address
      );
      stakedBalance = await uContract.stakedBalance(stakedGmxTrackerAddress);
      return expect(
        cTokenContract.borrow(formatAmount(test["borrowAmount"], uDecimals))
      ).is.not.eventually.rejected.then((tx) => {
        expect(tx).to.have.property("hash");
      });
    });
    it("Borrower should have higher borrowBalanceStored", async () => {
      expect(
        await cTokenContract.contract.borrowBalanceStored(wallet._address)
      ).bignumber.gt(borrowBalanceStored);
    });
    it("stakedGmxTracker should have less staked GMX", async () => {
      expect(
        await uContract.stakedBalance(stakedGmxTrackerAddress)
      ).bignumber.lt(stakedBalance);
    });
    it("Should be able to repay the loan", async () => {
      const borrowBalance = await cTokenContract.contract.borrowBalanceStored(
        wallet._address
      );
      let repayAmount = borrowBalance;
      const uBalance = await uContract.balanceOf(wallet._address);

      if (uBalance < borrowBalance) {
        repayAmount = uBalance;
      }
      // await cTokenContract.contract.repayBorrow(repayAmount);
      await cTokenContract.contract.repayBorrow(ethers.constants.MaxUint256);
      const remainingBorrowBalance = await cTokenContract.contract.borrowBalanceStored(
        wallet._address
      );
      const testRemaining = borrowBalance
        .sub(repayAmount)
        .eq(remainingBorrowBalance);
      expect(testRemaining).to.be.true;
    });

    //   it('Should not have liquidity after repaying and redeeming tokens', async () => {
    //     // needs 'balanceOfUnderlying' to be implemented properly
    //     const uBalance = await uContract.balanceOf(wallet._address)
    //     const tBalance = await cTokenContract.balanceOf(wallet._address);
    //     console.log(uBalance)
    //     console.log(tBalance)
    //     // await cTokenContract.mint(uBalance)
    //
    //     // let cash = BigNumber.from(await cTokenContract.contract.getCash()).add(BigNumber.from(await cTokenContract.contract.totalReserves()));
    //     // const borrowBalance = await cTokenContract.contract.borrowBalanceStored(wallet._address);
    //     // const marketInfo = await unitroller.markets(cTokenContract.address);
    //
    //
    //     // const expectedLiquidity = cash.sub(borrowBalance);
    //
    //     // stakedGmxTrackerAddress = await cTokenContract.contract.stakedGmxTracker()
    //     // const testLiquidity = expectedLiquidity.eq(reportedLiquidity);
    //     // console.log(reportedLiquidity)
    //     // console.log(expectedLiquidity)
    //     // expect(testLiquidity).to.be.true;
    //
    //     // find how much is stored in protocol and then redeemUnderlying that amount
    //     console.log("Borrow Balance", (await cTokenContract.contract.borrowBalanceStored(wallet._address)).toString());
    //     console.log(await cTokenContract.contract.balanceOfUnderlying(wallet._address));
    //     // await cTokenContract.redeemUnderlying(gmxStoredAmount);
    //     const { 1: reportedLiquidity } = await unitroller.getAccountLiquidity(wallet._address);
    //     console.log("Reported Liquidity", reportedLiquidity.toString());
    //     console.log(await cTokenContract.contract.balanceOfUnderlying(wallet._address));
    //
    //     // await cTokenContract.redeem(depositBalance);
    //     // console.log(reportedLiquidity);
    //     // expect(reportedLiquidity).eq(0);
    //   })
  });
  describe("balanceOfUnderlying", () => {
    it("Pre-deposit + total deposit amount <= after deposit", async () => {
      let getCash = await cTokenContract.contract.getCash();
      for (let i = 0; i < 3; i++) {
        // await uContract.approve(cTokenContract.address, formatAmount(test.mintAmount, uDecimals));
        await cTokenContract.mint(formatAmount(test["mintAmount"], uDecimals));
        totalDeposited = totalDeposited.add(
          formatAmount(test["mintAmount"], uDecimals)
        );
      }
      await cTokenContract.contract.balanceOfUnderlying(wallet._address);
      let getCashNew = await cTokenContract.contract.getCash();
      const depositedPlusCurrent = totalDeposited.add(getCash);
      const testBalance = getCashNew.gte(depositedPlusCurrent);
      expect(testBalance).is.true;
    });
  });

  describe("Caps", () => {
    let comptrollerProxy;
    let unitroller;
    let currentSupplyCap: BigNumber;
    let currentBorrowCap: BigNumber;
    let newSupplyCap: BigNumber;
    let newBorrowCap: BigNumber;
    let compAdmin;

    before(async () => {
      const comptrollerAddress = await cTokenContract.contract.comptroller();
      const comptrollerAbi = await getAbiFromArbiscan(comptrollerAddress);
      const comptroller = new Contract(
        comptrollerAddress,
        comptrollerAbi,
        wallet
      );
      let compAdminAddress = await comptroller.admin();
      compAdmin = await hre.ethers.getImpersonatedSigner(compAdminAddress);

      const unitrollerAddress = await comptroller.comptrollerImplementation();
      const unitrollerAbi = await getAbiFromArbiscan(unitrollerAddress);
      unitroller = new Contract(await comptrollerAddress, unitrollerAbi, compAdmin);
    });

    it("Should have assignable supply and borrow caps", async () => {
      currentBorrowCap = await unitroller.borrowCaps(cTokenContract.address);
      currentSupplyCap = await unitroller.supplyCaps(cTokenContract.address);

      // @params cTokens: address[], newBorrowCaps: BigNumber[], newSupplyCaps: BigNumber[]
      const setMarketBorrowCaps = async (
        cTokens: string[],
        newBorrowCaps: BigNumber[],
        newSupplyCaps: BigNumber[]
      ) => {
        await unitroller._setMarketBorrowCaps(
          cTokens,
          newBorrowCaps,
          newSupplyCaps
        );
      };
      const cTokens = [cTokenContract.address];

      let totalBorrows = await cTokenContract.contract.totalBorrows();

      const assignBorrowCaps = [
        formatAmount(".00001", uDecimals).add(currentBorrowCap),
      ];
      const assignSupplyCaps = [
        formatAmount(".00001", uDecimals).add(currentSupplyCap),
      ];

      await setMarketBorrowCaps(cTokens, assignBorrowCaps, assignSupplyCaps);

      newBorrowCap = await unitroller.borrowCaps(cTokenContract.address);
      newSupplyCap = await unitroller.supplyCaps(cTokenContract.address);
      totalBorrows = await cTokenContract.contract.totalBorrows();

      const borrowCapsSet = newBorrowCap.eq(assignBorrowCaps[0]);
      const supplyCapsSet = newSupplyCap.eq(assignSupplyCaps[0]);

      expect(borrowCapsSet).is.true;
      expect(supplyCapsSet).is.true;
    });
    it("Should respect borrowCap", async () => {
      let borrowBalanceStored = await cTokenContract.contract.borrowBalanceStored(
        wallet._address
      );
      const borrowAmount = newSupplyCap
        .sub(borrowBalanceStored)
        .add(BigNumber.from("1"));
      return expect(
        cTokenContract.borrow(borrowAmount)
      ).to.eventually.be.rejected.then((err) => {
        expect(err)
          .to.have.property("reason")
          .that.includes("market borrow cap reached");
      });
    });
    // it('Should respect supplyCap', async() => {
    // needs 'balanceOfUnderlying' to be implemented properly
    // const supplyCap = await unitroller.supplyCaps(cTokenContract.address);
    // const supplyAmount = newSupplyCap.add(BigNumber.from('1'))
    // expect(cTokenContract.mint(supplyAmount)).to.be.rejectedWith('market borrow cap reached');
    // })
  });
});
