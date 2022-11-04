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
import { CTokens } from "./deploy/CTOKENS"
import { deploy } from "./deploy/cdelegators";
import { readFileSync } from "fs";

const provider = hre.network.provider;

const unitrollerAddress = "0x49Ea2c991290cA13f57Ae2b8ca98bC6140925db3";
const comptrollerAddress = "0x0e9109c678ba6E807Dd53ECf7A5A1e658681AD70";
const IERC20 = 'contracts/IERC20.sol:IERC20'
const CERC20 = 'contracts/CErc20.sol:CErc20'

describe("TestLiquidate", () => {
  const USDT_WHALE="0x750f6Ed08f00f5e1c519e650d82d6Ff101E60841";
  const USDC_WHALE="0x39ef179bB1953f916003F5Dc9a321ce978df3118"
  let usdcWallet;
  let usdtWallet;

  let borrowTokens;
  let supplyTokens;

  let deployed;

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

    await deploy('arbitrum');

    const deploymentFork = 'arbitrum'
    const deploymentRead = 'localhost'

    deployed = JSON.parse(
      readFileSync(
        resolve(__dirname, `../../deployments/localhost.json`),
        'utf-8'
      )
    );

    borrowTokens = { //USDT
      uToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      tToken: deployed['tUSDT'],
    }

    supplyTokens = { //USDC
      uToken: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      tToken: deployed['tUSDC'],
      // tToken: "0xB1087a450373BB26BCf1A18E788269bde9c8fc85",
    }

    usdcWallet = await ethers.getImpersonatedSigner(USDC_WHALE);
    usdtWallet = await ethers.getImpersonatedSigner(USDT_WHALE);
    await fundWithEth(USDC_WHALE);
    await fundWithEth(USDT_WHALE);

    uTokenSupply = await ethers.getContractAt(IERC20, supplyTokens['uToken'])
    tTokenSupply = await ethers.getContractAt(CERC20, supplyTokens['tToken'])
    uTokenBorrow = await ethers.getContractAt(IERC20, borrowTokens['uToken'])
    tTokenBorrow = await ethers.getContractAt(CERC20, borrowTokens['tToken'])

    const comptrollerAddress = deployed['Unitroller'];
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
        formatAmount('1', 18)
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
    await tTokenSupply.connect(usdcWallet).mint(formatAmount('2', 6));
    await tTokenBorrow.connect(usdtWallet).mint(formatAmount('1000', 6));

    console.log(await unitroller.getAccountLiquidity(USDC_WHALE))
    console.log(await unitroller.getAccountLiquidity(USDT_WHALE))

    console.log('borrowing')

    const borrowedBalance = async (tTokenContract, wallet) => {
      const tTokenBalance = await tTokenContract.connect(wallet).borrowBalanceStored(wallet.address);
      const exchangeRate = await tTokenContract.connect(wallet).exchangeRateStored();
      return tTokenBalance.mul(exchangeRate).div(formatAmount('1', 18))
    };

    const underlyingBalance = async (tTokenContract, wallet) => {
      const tTokenBalance = await tTokenContract.connect(wallet).balanceOf(wallet.address);
      const exchangeRate = await tTokenContract.connect(wallet).exchangeRateStored();
      // amount of underlying tokens minus interest accrued
      return tTokenBalance.mul(exchangeRate).div(formatAmount('1', 18))
    };

    const uBalanceSupplied = await underlyingBalance(tTokenSupply, usdcWallet)
    const {1: collateralFactor} = await unitroller.markets(borrowTokens['tToken'])
    console.log('collateral factor', collateralFactor.toString())
    const maxBorrow = (uBalanceSupplied.mul(collateralFactor)).div(formatAmount('1', 18))
    console.log('max borrow', maxBorrow.toString())
    await tTokenBorrow.connect(usdcWallet).borrow(maxBorrow);

    console.log("After Borrow",
      await unitroller.getAccountLiquidity(USDC_WHALE)
    );

    await mockPriceOracle.mockUpdatePrice(
      tTokenSupply.address,
      formatAmount('.1', 18)
    );

    console.log("After Price Update",
      await unitroller.getAccountLiquidity(USDC_WHALE)
    );

    const closeFactor = await unitroller.closeFactorMantissa();
    const shortfall = await borrowedBalance(tTokenBorrow, usdcWallet)

    const repayAmount = (shortfall.mul(closeFactor)).div(formatAmount('1', 16))
    // console.log('usdt whale tUSDC balance before liquidation of usdc whale:', await tTokenSupply.balanceOf(USDT_WHALE))
    await tTokenBorrow.connect(usdtWallet).liquidateBorrow(USDC_WHALE, repayAmount, supplyTokens['tToken'])
    console.log('usdt whale tUSDC balance after liquidation of usdc whale:', await tTokenSupply.balanceOf(USDT_WHALE))
    console.log("Liquidity of borrower after liquidation",
      await unitroller.getAccountLiquidity(USDC_WHALE)
    );
  })
})

const fundWithEth = async (receiver) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({to: receiver, value: ethers.utils.parseEther("1.0")})
}

