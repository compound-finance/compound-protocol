import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { Wallet } from "zksync-web3";
import { getChainId } from "../script/utils";
import deployContract from "../script/deployContract";
import { deployCTokenAll } from "../script/deployCToken";
import {
  recordTokenAddress,
  recordCTokenAddress
} from "../script/deployAddresses";
import {
  deployOracle,
  deployUnitroller,
  deployInterestRate,
  deployLens,
  deployMaximillion,
  deployMulticall,
  configurePriceOracle,
  addCTokenToMarket
} from "../script/deployCore";
import {
  CEtherConstructorArgs,
  Erc20ConstructorArgs
} from "../script/types";

async function deployCEther(
  deployer: Deployer,
  priceOracle: ethers.Contract,
  comptroller: ethers.Contract,
  interestRateModel: ethers.Contract
): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const initialExchangeRateMantissa: ethers.BigNumber = ethers.utils.parseEther("1");
  const name: string = "Zoro Ether";
  const symbol: string = "cETH";
  const decimals: number = 18;
  const admin: string = deployer.zkWallet.address;
  const cetherArgs: CEtherConstructorArgs = [
    comptroller.address,
    interestRateModel.address,
    initialExchangeRateMantissa,
    name,
    symbol,
    decimals,
    admin
  ];
  const cether: ethers.Contract = await deployContract(deployer, "CEther", cetherArgs);

  recordCTokenAddress(chainId, "eth", cether.address);

  await configurePriceOracle(priceOracle, cether.address);
  await addCTokenToMarket(comptroller, cether.address);

  return cether;
}

async function deployTestUsd(deployer: Deployer): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const initialAmount: ethers.BigNumber = ethers.utils.parseEther("10000000");
  const tokenName: string = "TestUSD";
  const decimalUnits: number = 18;
  const tokenSymbol: string = "TEST";
  const testUsdArgs: Erc20ConstructorArgs = [
    initialAmount,
    tokenName,
    decimalUnits,
    tokenSymbol
  ];

  const tUsd: ethers.Contract = await deployContract(
    deployer,
    "contracts/core/tests/Contracts/ERC20.sol:StandardToken",
    testUsdArgs
  );

  recordTokenAddress(chainId, "test", tUsd.address);

  return tUsd;
}

// An example of a deploy script that will deploy and call a simple contract.
export default async function(hre: HardhatRuntimeEnvironment) {
  const chainId: number = getChainId(hre);

  console.log(`Running deploy script for Zoro Protocol`);

  const wallet: Wallet = await hre.getZkWallet();

  // Create deployer object and load the artifact of the contract you want to deploy.
  const deployer: Deployer = new Deployer(hre, wallet);

  // OPTIONAL: Deposit funds to L2
  // Comment this block if you already have funds on zkSync.
  // const depositHandle = await deployer.zkWallet.deposit({
  //   to: deployer.zkWallet.address,
  //   token: utils.ETH_ADDRESS,
  //   amount: deploymentFee.mul(2),
  // });
  // Wait until the deposit is processed on zkSync
  // await depositHandle.wait();

  const priceOracle: ethers.Contract = await deployOracle(deployer);

  const comptroller: ethers.Contract = await deployUnitroller(deployer, priceOracle);

  const jumpRate: ethers.Contract = await deployInterestRate(deployer);

  await deployLens(deployer);

  const cether: ethers.Contract = await deployCEther(
    deployer,
    priceOracle,
    comptroller,
    jumpRate
  );

  await deployMaximillion(deployer, cether);

  if (chainId === 270) {
    console.log("Deploying contracts for local test network");

    await deployMulticall(deployer);

    await deployTestUsd(deployer);
  }

  await deployCTokenAll(deployer, priceOracle, comptroller, jumpRate);
}
