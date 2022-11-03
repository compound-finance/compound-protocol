import {
  JsonRpcSigner,
  JsonRpcProvider,
  ExternalProvider,
} from "@ethersproject/providers";
import "@nomiclabs/hardhat-ethers"
import { ComptrollerContract } from "./contract_helpers/Comptroller";
import { OracleContract } from "./contract_helpers/PriceOracle";
import { getWallet, getAbiFromArbiscan, resetNetwork } from "./utils/TestUtil";
import hre, { artifacts, ethers } from "hardhat";
import { Contract, BigNumber } from "ethers";
import { expect } from "chai";
import { formatAmount } from "./utils/TokenUtil";
import { resolve } from 'path'
import { parseAbiFromJson, getDeployments } from "./utils/TestUtil";
import * as tokenClasses from "./contract_helpers/Token";
import { copyFile } from "fs";

const provider = hre.network.provider;

const unitrollerAddress = "0x49Ea2c991290cA13f57Ae2b8ca98bC6140925db3";
const comptrollerAddress = "0x0e9109c678ba6E807Dd53ECf7A5A1e658681AD70";
const IERC20 = 'contracts/IERC20.sol:IERC20'
const CERC20 = 'contracts/CErc20.sol:CErc20'

const borrowTokens = { //USDT
  uToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  tToken: "0x102517Ea9340eDd21afdfAA911560311FeEFc607",
}

const supplyTokens = { //USDC
  uToken: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  tToken: "0xB1087a450373BB26BCf1A18E788269bde9c8fc85",
}

describe("TestLiquidate", () => {
  const USDT_WHALE="0x750f6Ed08f00f5e1c519e650d82d6Ff101E60841";
  const USDC_WHALE="0x39ef179bB1953f916003F5Dc9a321ce978df3118"
  let usdcWallet;
  let usdtWallet;

  let uTokenSupply;
  let tTokenSupply;
  let uTokenBorrow;
  let tTokenBorrow;
  let unitroller;

  let mockPriceOracle;
  const mockPriceOracleAddress = '0x0e9109c678ba6E807Dd53ECf7A5A1e658681AD70';


  let unitrollerProxy;

  before(async () => {
    await resetNetwork();
    usdcWallet = await ethers.getImpersonatedSigner(USDC_WHALE);
    usdtWallet = await ethers.getImpersonatedSigner(USDT_WHALE);
    await fundWithEth(USDC_WHALE);
    await fundWithEth(USDT_WHALE);

    uTokenSupply = await ethers.getContractAt(IERC20, supplyTokens['uToken'])
    tTokenSupply = await ethers.getContractAt(CERC20, supplyTokens['tToken'])
    uTokenBorrow = await ethers.getContractAt(IERC20, borrowTokens['uToken'])
    tTokenBorrow = await ethers.getContractAt(CERC20, borrowTokens['tToken'])

    const comptrollerAddress = '0x49ea2c991290ca13f57ae2b8ca98bc6140925db3';
    const comptrollerAbi = await getAbiFromArbiscan(comptrollerAddress);

    const comptroller = new Contract(
      comptrollerAddress,
      comptrollerAbi,
      usdcWallet
    );

    let adminAddress = await comptroller.admin();
    let admin = await ethers.getImpersonatedSigner(adminAddress);

    const unitrollerAddress = await comptroller.comptrollerImplementation();
    const unitrollerAbi = await getAbiFromArbiscan(unitrollerAddress);

    unitroller = new Contract(
      comptrollerAddress,
      unitrollerAbi,
      admin
    );

    console.log('initializing price oracle')
    const [deployer] = await ethers.getSigners();
    const MockPriceOracleFactory = await ethers.getContractFactory('MockPriceOracle')
    mockPriceOracle = await MockPriceOracleFactory.deploy()
    await mockPriceOracle.deployed();
    console.log('mock price oracle deployed at', mockPriceOracle.address)
    mockPriceOracle = await mockPriceOracle.connect(deployer);

    await unitroller.connect(admin)._setPriceOracle(mockPriceOracle.address);
    for (let token of await unitroller.getAllMarkets()){
      await mockPriceOracle.mockUpdatePrice(
        token,
        formatAmount('.01', 18)
      )
    }
  })
  it("TestLiquidate", async () => {

    console.log('initializing')
    uTokenSupply = await uTokenSupply.connect(usdcWallet);
    await uTokenSupply.approve(supplyTokens['tToken'], ethers.constants.MaxUint256)
    console.log(await uTokenSupply.balanceOf(usdcWallet.address))
    uTokenBorrow = await uTokenBorrow.connect(usdtWallet);
    await uTokenBorrow.approve(borrowTokens['tToken'], ethers.constants.MaxUint256)
    console.log(await uTokenBorrow.balanceOf(usdtWallet.address))

    console.log('sending usdc to usdt whale')
    await uTokenSupply.connect(usdcWallet).transfer(USDT_WHALE, formatAmount('10', 6))

    console.log('minting')
    await tTokenSupply.connect(usdcWallet).mint(formatAmount('1', 6));
    await tTokenBorrow.connect(usdtWallet).mint(formatAmount('100', 6));

    console.log(await unitroller.getAccountLiquidity(USDC_WHALE))
    console.log(await unitroller.getAccountLiquidity(USDT_WHALE))

    console.log('borrowing')

    const underlyingBalance = async (tTokenContract, wallet) => {
      const tTokenBalance = await tTokenContract.connect(wallet).balanceOf(wallet.address);
      const exchangeRate = await tTokenContract.connect(wallet).exchangeRateStored();
      // amount of underlying tokens minus interest accrued
      return tTokenBalance.mul(exchangeRate).div(formatAmount('1', 18))
    };

    const uBalanceSupplied = await underlyingBalance(tTokenSupply, usdcWallet)
    const {1: collateralFactor} = await unitroller.markets(borrowTokens['tToken'])
    const maxBorrow = (uBalanceSupplied.mul(collateralFactor)).div(formatAmount('1', 18))
    await tTokenBorrow.connect(usdcWallet).borrow(maxBorrow);

    console.log("After Borrow",
      await unitroller.getAccountLiquidity(USDC_WHALE)
    );

    await mockPriceOracle.mockUpdatePrice(
      tTokenBorrow.address,
      formatAmount('.03', 18)
    );

    console.log("After Price Update",
      await unitroller.getAccountLiquidity(USDC_WHALE)
    );
    const closeFactor = await unitroller.closeFactorMantissa();
    const shortfall = await underlyingBalance(tTokenSupply, usdcWallet)
    const repayAmount = ((shortfall.mul(closeFactor)).div(formatAmount('1', 18))).div(2);
    console.log(closeFactor)
    console.log('repay amount', repayAmount)
    console.log('usdt whale tUSDC balance before liquidation of usdc whale:', await tTokenSupply.balanceOf(USDT_WHALE))
    await tTokenBorrow.connect(usdtWallet).liquidateBorrow(USDC_WHALE, repayAmount, supplyTokens['tToken'])
    console.log('usdt whale tUSDC balance after liquidation of usdc whale:', await tTokenSupply.balanceOf(USDT_WHALE))
    console.log(await underlyingBalance(tTokenSupply, usdcWallet))
  })
})

const fundWithEth = async (receiver) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({to: receiver, value: ethers.utils.parseEther("1.0")})
}

