import { existsSync, readFileSync, writeFileSync } from "fs";
import { utils } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import deployContract from "../script/zksync/deployContract";
import { deployCTokenAll } from "../script/zksync/deployCToken";
import {
  getUnderlyingTokens,
  recordMainAddress,
  recordTokenAddress,
  recordCTokenAddress
} from "../script/zksync/deployAddresses";
import {
  deployOracle,
  deployComptroller,
  deployInterestRate,
  deployLens,
  deployMaximillion,
  deployMulticall,
  configureComptroller,
  configurePriceOracle,
  addCTokenToMarket
} from "../script/zksync/deployCore";

async function deployCEther(
  deployer: Deployer,
  priceOracle: ethers.Contract,
  comptroller: ethers.Contract,
  interestRateModel: ethers.Contract
) {
  const chainId = deployer.hre.network.config.chainId;

  const initialExchangeRateMantissa:number = ethers.utils.parseEther("1");
  const name:string = "Zoro Ether";
  const symbol:string = "cETH";
  const decimals:number = 18;
  const admin = deployer.zkWallet.address;
  const cetherArgs = [
      comptroller.address,
      interestRateModel.address,
      initialExchangeRateMantissa,
      name,
      symbol,
      decimals,
      admin,
  ];
  const cether = await deployContract(deployer, "CEther", cetherArgs);

  recordCTokenAddress(chainId, "eth", cether.address);

  await configurePriceOracle(priceOracle, cether.address);
  await addCTokenToMarket(comptroller, cether.address);

  return cether;
}

async function deployTestUsd(deployer: Deployer) {
  const chainId = deployer.hre.network.config.chainId;

  const initialAmount = ethers.utils.parseEther("10000000");
  const tokenName = "TestUSD";
  const decimalUnits = 18;
  const tokenSymbol = "TEST";
  const testUsdArgs:Array = [
      initialAmount,
      tokenName,
      decimalUnits,
      tokenSymbol,
  ];

  const tUsd = await deployContract(deployer, "contracts/test/ERC20.sol:StandardToken", testUsdArgs);

  recordTokenAddress(chainId, "test", tUsd.address);

  return tUsd;
}

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  const chainId = hre.network.config.chainId;

  console.log(`Running deploy script for Zoro Protocol`);

  const wallet = await hre.getWallet();

  // Create deployer object and load the artifact of the contract you want to deploy.
  const deployer = new Deployer(hre, wallet);

  // OPTIONAL: Deposit funds to L2
  // Comment this block if you already have funds on zkSync.
  // const depositHandle = await deployer.zkWallet.deposit({
  //   to: deployer.zkWallet.address,
  //   token: utils.ETH_ADDRESS,
  //   amount: deploymentFee.mul(2),
  // });
  // Wait until the deposit is processed on zkSync
  // await depositHandle.wait();

  const priceOracle = await deployOracle(deployer);

  const comptroller = await deployComptroller(deployer, priceOracle);

  const jumpRate = await deployInterestRate(deployer);

  const lens = await deployLens(deployer);

  const cether = await deployCEther(deployer, priceOracle, comptroller, jumpRate);

  const maxi = await deployMaximillion(deployer, cether);

  if (chainId === 270) {
    console.log("Deploying contracts for local test network");

    const multicall = await deployMulticall(deployer);

    const tUsd = await deployTestUsd(deployer);
  }

  await deployCTokenAll(deployer, priceOracle, comptroller, jumpRate);
}
