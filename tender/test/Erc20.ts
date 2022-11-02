import {
  JsonRpcSigner,
  JsonRpcProvider,
  ExternalProvider,
} from "@ethersproject/providers";
import { CTokenContract, GmxTokenContract } from "./contract_helpers/Token";
import { ComptrollerContract } from "./contract_helpers/Comptroller";
import { OracleContract } from "./contract_helpers/PriceOracle";
import { getWallet, getAbiFromArbiscan, resetNetwork } from "./utils/TestUtil";
import * as hre from "hardhat";
import * as ethers from "ethers";
import { Contract, BigNumber } from "ethers";
import { expect } from "chai";
import { formatAmount } from "./utils/TokenUtil";
import { resolve } from 'path'
import { parseAbiFromJson, getDeployments } from "./utils/TestUtil";
import * as tokenClasses from "./contract_helpers/Token";
const hreProvider = hre.network.provider;

const provider = new ethers.providers.Web3Provider(hreProvider as any);
// USE THE DELEGATOR FILE INSTEAD OF THE CETHER AND CERC20!!!!

const test = {
  symbol: "tUSDC",
  contractName: "CErc20",
  mintAmount: "4",
  borrowAmount: "1",
  redeemAmount: "1",
  redeemUnderlyingAmount: "1",
  contractClass: CTokenContract,
  liquidate: "yes",
  address: "0xB1087a450373BB26BCf1A18E788269bde9c8fc85",
};

const testUsdt = {
  symbol: "tUSDT",
  contractName: "CErc20",
  mintAmount: "4",
  borrowAmount: "1",
  redeemAmount: "1",
  redeemUnderlyingAmount: "1",
  contractClass: CTokenContract,
  liquidate: "yes",
  address: "0x102517Ea9340eDd21afdfAA911560311FeEFc607",
};

const testOptionalDefaults = {
  contractClass: CTokenContract,
  deploymentFilePath: "../../deployments/arbitrum.json",
};

const verifyTestParameters = (test) => {
  for (let [key, val] of Object.entries(testOptionalDefaults)) {
    test[key] = test[key] ? test[key] : val;
  }
  return test;
};

let tUsdcContract: CTokenContract;
let tUsdtContract: CTokenContract;
let comptrollerContract: ComptrollerContract;
let uContractAddress: string;
let uContract: Contract;
let wallet;
let admin: JsonRpcSigner;
let usdtContract;

let uBalanceProvider: Contract | JsonRpcProvider;

let walletAddress = "0x52134afB1A391fcEEE6682E51aedbCD47dC55336";
const adminAddress = "0x85abbc0f8681c4fb33b6a3a601ad99e92a32d1ac";

describe("Erc20", () => {
  before(async () => {
    resetNetwork();
    wallet = await getWallet(walletAddress, provider);
    admin = await getWallet(adminAddress, provider);
    tUsdcContract = new CTokenContract(
      test["symbol"],
      test["contractName"],
      wallet,
      test["deploymentFile"]
    );

    const uAbiPath = resolve(
      __dirname,
      `../../artifacts/contracts/CErc20.sol/CErc20.json`
    );
    const uAbi = parseAbiFromJson(uAbiPath);

    let uContractOne = new Contract(await tUsdcContract.underlying(), uAbi, wallet);

    tUsdcContract.address = test["address"];
    await uContractOne.approve(
      tUsdcContract.address,
      '1000000000000000000000000000'
    );


    tUsdtContract = new CTokenContract(
      testUsdt["symbol"],
      testUsdt["contractName"],
      wallet,
      testUsdt["deploymentFile"]
    );
    tUsdtContract.address = testUsdt["address"];
    let uContractTwo = new Contract(await tUsdtContract.underlying(), uAbi, wallet);
    usdtContract = uContractTwo;


    await uContractTwo.approve(
      tUsdtContract.address,
      '1000000000000000000000000000'
    );
  });
  describe("Liquidate", () => {
    let oracleContract: OracleContract;
    let liquidator: JsonRpcSigner;
    let unitroller;
    const liquidatorAddress = "0x88964546aa6d9da1306bf0a29cc01cde8b0c660e";

    before(async () => {
      const comptrollerAddress = await tUsdtContract.comptroller();
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
        admin
      );

      liquidator = await getWallet(liquidatorAddress, provider);
      oracleContract = new OracleContract("MockPriceOracle", wallet);
      await unitroller._setPriceOracle(oracleContract.address);
      await unitroller.connect(wallet);
    });

    it("Should liquidate if account liquidity is negative", async () => {

      await oracleContract.mockUpdatePrice(
        tUsdcContract.address,
        formatAmount('1', 18)
      );

      await oracleContract.mockUpdatePrice(
        tUsdtContract.address,
        formatAmount('1', 18)
      );

      await oracleContract.mockUpdatePrice(
        "0x593b3eF799b219d80dD8F0556d1aA8bC362fe48C",
        formatAmount('1', 18)
      )

      let tEthContract = new CTokenContract('tEth', 'CEther', wallet);

      console.log("Before Everything",
        await unitroller.getAccountLiquidity(walletAddress)
      );

      await unitroller.enterMarkets([tUsdcContract.address, tUsdtContract.address, tEthContract.address]);


      console.log("Before Everything",
        await unitroller.getAccountLiquidity(walletAddress)
      );

      await tEthContract.redeem(await tEthContract.balanceOf(walletAddress))
      let assets = await unitroller.getAssetsIn(walletAddress);

      let usdtWallet = await getWallet('0x9bf54297d9270730192a83EF583fF703599D9F18', provider)

      // error code
      // account liquidity
      console.log("Before Everything",
        await unitroller.getAccountLiquidity(walletAddress)
      );
      await usdtContract.connect(usdtWallet).approve(tUsdtContract.address, '1000000000000000000000000000000')
      await tUsdtContract.contract.connect(usdtWallet).mint(1000)

      let usdcBalance = await tUsdcContract.getUnderlyingBalance(walletAddress);

      console.log(usdcBalance)
      await tUsdcContract.contract.mint(usdcBalance);
      console.log(await tUsdcContract.balanceOf(walletAddress))

      assets = await unitroller.getAssetsIn(walletAddress);
      console.log(assets)

      console.log("After Supply Eth",
        await unitroller.getAccountLiquidity(walletAddress)
      );

      await tUsdtContract.borrow(await tUsdcContract.balanceOf(walletAddress));

      console.log("After Borrow",
        await unitroller.getAccountLiquidity(walletAddress)
      );

      await oracleContract.mockUpdatePrice(
        tUsdtContract.address,
        formatAmount('3', 18)
      );

      console.log("After Price Update",
        await unitroller.getAccountLiquidity(walletAddress)
      );
    });
  });
});
