import {
  JsonRpcSigner,
  JsonRpcProvider,
  ExternalProvider,
} from "@ethersproject/providers";
import "@nomiclabs/hardhat-ethers";
import hre, { artifacts, ethers } from "hardhat";
import {
  getAbiFromArbiscan,
  resetNetwork,
  parseAbiFromJson,
  getDeployments,
} from "./utils/TestUtil";
import { Contract, BigNumber } from "ethers";
import { formatAmount } from "./utils/TokenUtil";
import { resolve } from "path";
import { copyFile, readFileSync } from "fs";
import { deploy } from "./deploy/cdelegators";
import { WHALES, CTOKENS, IERC20, CERC20 } from "./utils/constants";
import { expect } from "./utils/chai";

const provider = hre.network.provider;

const borrowedBalance = async (tTokenContract, wallet) => {
  const tTokenBalance = await tTokenContract
    .connect(wallet)
    .borrowBalanceStored(wallet.address);
  const exchangeRate = await tTokenContract
    .connect(wallet)
    .exchangeRateStored();
  return tTokenBalance.mul(exchangeRate).div(formatAmount("1", 18));
};

const underlyingBalance = async (tTokenContract, wallet) => {
  const tTokenBalance = await tTokenContract
    .connect(wallet)
    .balanceOf(wallet.address);
  const exchangeRate = await tTokenContract
    .connect(wallet)
    .exchangeRateStored();
  // amount of underlying tokens minus interest accrued
  return tTokenBalance.mul(exchangeRate).div(formatAmount("1", 18));
};

const preLiquidationTest = async (
  deployments,
  collateralToken,
  borrowToken
) => {
  const uCollateralWallet = await ethers.getImpersonatedSigner(
    WHALES[collateralToken.underlyingSymbol]
  );
  const uBorrowWallet = await ethers.getImpersonatedSigner(
    WHALES[borrowToken.underlyingSymbol]
  );

  await fundWithEth(uCollateralWallet.address);
  await fundWithEth(uCollateralWallet.address);

  const uTokenCollateral = await ethers.getContractAt(
    IERC20,
    collateralToken.underlying
  );

  const tTokenCollateral = await ethers.getContractAt(
    CERC20,
    deployments[collateralToken.symbol]
  );

  const uTokenBorrow = await ethers.getContractAt(
    IERC20,
    borrowToken.underlying
  );

  const tTokenBorrow = await ethers.getContractAt(
    CERC20,
    deployments[borrowToken.symbol]
  );

  const comptrollerAddress = deployments["Unitroller"];
  const comptrollerAbi = await getAbiFromArbiscan(comptrollerAddress);

  const comptroller = new Contract(
    comptrollerAddress,
    comptrollerAbi,
    uCollateralWallet
  );

  let adminAddress = await comptroller.admin();
  let admin = await ethers.getImpersonatedSigner(adminAddress);

  const unitrollerAddress = await comptroller.comptrollerImplementation();
  const unitrollerAbi = await getAbiFromArbiscan(unitrollerAddress);

  let unitroller = new Contract(comptrollerAddress, unitrollerAbi, admin);

  const mockPriceOracle = await ethers.getContractAt(
    "MockPriceOracle",
    deployments["MockPriceOracle"]
  );

  for (let token of await unitroller.getAllMarkets()) {
    await mockPriceOracle.mockUpdatePrice(token, formatAmount("1", 18));
  }

  await unitroller._setPriceOracle(mockPriceOracle.address);

  await uTokenCollateral
    .connect(uCollateralWallet)
    .approve(tTokenCollateral.address, ethers.constants.MaxUint256);
  await uTokenBorrow
    .connect(uBorrowWallet)
    .approve(tTokenBorrow.address, ethers.constants.MaxUint256);

  await uTokenCollateral
    .connect(uCollateralWallet)
    .transfer(uBorrowWallet.address, formatAmount("10", 6));

  await tTokenCollateral.connect(uCollateralWallet).mint(formatAmount("2", 6));
  await tTokenBorrow.connect(uBorrowWallet).mint(formatAmount("1000", 6));

  const uBalanceSupplied = await underlyingBalance(
    tTokenCollateral,
    uCollateralWallet
  );
  const { 1: collateralFactor } = await unitroller.markets(
    tTokenBorrow.address
  );
  const maxBorrow = uBalanceSupplied
    .mul(collateralFactor)
    .div(formatAmount("1", 18));

  await tTokenBorrow.connect(uCollateralWallet).borrow(maxBorrow);

  await mockPriceOracle.mockUpdatePrice(
    tTokenCollateral.address,
    formatAmount(".1", 18)
  );

  const closeFactor = await unitroller.closeFactorMantissa();
  const shortfall = await borrowedBalance(tTokenBorrow, uCollateralWallet);
  const repayAmount = shortfall.mul(closeFactor).div(formatAmount("1", 16));

  const liquidatorBalancePre = await tTokenCollateral.balanceOf(
    uBorrowWallet.address
  );
  const { 2: preLiquidateShortfall } = await unitroller.getAccountLiquidity(
    uCollateralWallet.address
  );
  await tTokenBorrow
    .connect(uBorrowWallet)
    .liquidateBorrow(
      uCollateralWallet.address,
      repayAmount,
      tTokenCollateral.address
    );
  const { 2: postLiquidateShortfall } = await unitroller.getAccountLiquidity(
    uCollateralWallet.address
  );
  const liquidatorBalancePost = await tTokenCollateral.balanceOf(
    uBorrowWallet.address
  );

  return {
    preLiquidation: {
      shortfall: preLiquidateShortfall,
      liquidatorBalance: liquidatorBalancePre,
    },
    postLiquidation: {
      shortfall: postLiquidateShortfall,
      liquidatorBalance: liquidatorBalancePost,
    },
  };
};

const fundWithEth = async (receiver) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({
    to: receiver,
    value: ethers.utils.parseEther("1.0"),
  });
};

describe("Test", () => {
  let deployments;
  const collateralToken = CTOKENS["tUSDC"];
  const borrowToken = CTOKENS["tUSDT"];

  before(async () => {
    await resetNetwork();
    await deploy("arbitrum");
    deployments = getDeployments("localhost");
  });
  describe("Liquidation", () => {
    let preLiquidation;
    let postLiquidation;
    before(async () => {
      let results = await preLiquidationTest(
        deployments,
        collateralToken,
        borrowToken
      );
      preLiquidation = results.preLiquidation;
      postLiquidation = results.postLiquidation;
    });
    it("Borrower show have lower shortfall after liquidation", async () => {
      expect(postLiquidation.shortfall).bignumber.lt(preLiquidation.shortfall);
    });
    it("Liquidator should have more of liquidated token after liquidation", async () => {
      expect(postLiquidation.liquidatorBalance).bignumber.gt(
        preLiquidation.liquidatorBalance
      );
    });
  });
});
