import { existsSync, readFileSync, writeFileSync } from "fs";
import { utils } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

function recordAddress(path:string, chainId:number, name:string, address:string) {
  let addresses = {};

  if (existsSync(path)) {
    const json = readFileSync(path);
    addresses = JSON.parse(json);
  }

  const newAddresses = { [name]: { [chainId]: address } };
  const updatedAddresses = Object.assign(addresses, newAddresses);

  const newJson = JSON.stringify(updatedAddresses, null, 2);
  writeFileSync(path, newJson);
}

async function deployContract(deployer: Deployer, name:string, args:Array) {
  const artifact = await deployer.loadArtifact(name);

  // Estimate contract deployment fee
  const deploymentFee = await deployer.estimateDeployFee(artifact, args);

  const parsedFee = ethers.utils.formatEther(deploymentFee.toString());
  console.log(`The deployment is estimated to cost ${parsedFee} ETH`);

  const contract = await deployer.deploy(artifact, args);

  //obtain the Constructor Arguments
  console.log("constructor args:" + contract.interface.encodeDeploy(args));

  // Show the contract info.
  const contractAddress = contract.address;
  console.log(`${artifact.contractName} was deployed to ${contractAddress}`);

  // Verify contract programmatically 
  //
  // Contract MUST be fully qualified name (e.g. path/sourceName:contractName)
  // const contractFullyQualifedName = "contracts/Comptroller.sol:Comptroller";
  // const verificationId = await hre.run("verify:verify", {
  //   address: contractAddress,
  //   contract: contractFullyQualifedName,
  //   constructorArguments: [],
  //   bytecode: artifact.bytecode,
  // });
  // console.log(`${contractFullyQualifedName} verified! VerificationId: ${verificationId}`)

  return contract;
}

async function deployInterestRate(deployer: Deployer) {
  // 5% base rate and 20% + 5% interest at kink and 200% multiplier starting at the kink of 90% utilization
  const baseRatePerYear:BigNumber = ethers.utils.parseEther("0.05");
  const multiplierPerYear:BigNumber = ethers.utils.parseEther("0.2");
  const jumpMultiplierPerYear:BigNumber = ethers.utils.parseEther("2");
  const kink:BigNumber = ethers.utils.parseEther("0.9");
  const owner:string = deployer.zkWallet.address;

  const interestRateArgs:Array = [
      baseRatePerYear,
      multiplierPerYear,
      jumpMultiplierPerYear,
      kink,
      owner,
  ];
  const jumpRate = await deployContract(deployer, "JumpRateModelV2", interestRateArgs);

  return jumpRate;
}

async function deployCEther(deployer: Deployer, comptrollerAddress:string, interestRateModel:string) {
  const initialExchangeRateMantissa:number = ethers.utils.parseEther("1");
  const name:string = "Zoro Ether";
  const symbol:string = "cETH";
  const decimals:number = 18;
  const admin = deployer.zkWallet.address;
  const cetherArgs = [
      comptrollerAddress,
      interestRateModel,
      initialExchangeRateMantissa,
      name,
      symbol,
      decimals,
      admin,
  ];
  const cether = await deployContract(deployer, "CEther", cetherArgs);

  return cether;
}

async function deployTestUsd(deployer: Deployer) {
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

  return tUsd;
}

async function deployCTestUsd(deployer: Deployer, underlying:string, comptrollerAddress:string, interestRateModel:string) {
  const initialExchangeRateMantissa:number = ethers.utils.parseEther("1");
  const name:string = "Zoro TestUSD";
  const symbol:string = "zTEST";
  const decimals:number = 18;
  const admin = deployer.zkWallet.address;
  const ctUsdArgs = [
      underlying,
      comptrollerAddress,
      interestRateModel,
      initialExchangeRateMantissa,
      name,
      symbol,
      decimals,
      admin,
  ];
  const ctUsd = await deployContract(deployer, "CErc20Immutable", ctUsdArgs);

  return ctUsd;
}

async function configureComptroller(comptroller: Contract, priceOracleAddress:string) {
  const oracleTx = await comptroller._setPriceOracle(priceOracleAddress);
  await oracleTx.wait();

  const closeFactor = ethers.utils.parseEther("0.5");
  const closeFactorTx = await comptroller._setCloseFactor(closeFactor)
  await closeFactorTx.wait();

  const liquidationIncentive = ethers.utils.parseEther("1.1");
  const incentiveTx = await comptroller._setLiquidationIncentive(liquidationIncentive);
  await incentiveTx.wait();
}

async function configurePriceOracle(priceOracle: Contract, ctokenAddress:string) {
  const price = ethers.utils.parseEther("1");
  const setPriceTx = await priceOracle.setUnderlyingPrice(ctokenAddress, price);
  await setPriceTx.wait();
}

async function addCTokenToMarket(comptroller: Contract, ctokenAddress:string) {
  const addMarketTx = await comptroller._supportMarket(ctokenAddress);
  await addMarketTx.wait();

  // If the ctoken isn't a supported market, it will fail to set the collateral factor
  const collateralFactor:BigNumber = ethers.utils.parseEther("0.5");
  const collateralTx = await comptroller._setCollateralFactor(ctokenAddress, collateralFactor);
  await collateralTx.wait();
}

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  const chainId = hre.network.config.chainId;
  const recordMainAddress = recordAddress.bind(null, "deploy/main.json", chainId);
  const recordTokenAddress = recordAddress.bind(null, "deploy/tokens.json", chainId);
  const recordCTokenAddress = recordAddress.bind(null, "deploy/zTokens.json", chainId);

  console.log(`Running deploy script for Zoro Protocol`);

  const wallet = hre.zkWallet;

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

  const priceOracle = await deployContract(deployer, "SimplePriceOracle", []);
  recordMainAddress("oracle", priceOracle.address);

  const comptroller = await deployContract(deployer, "Comptroller", []);
  recordMainAddress("comptroller", comptroller.address);

  await configureComptroller(comptroller, priceOracle.address);

  const jumpRate = await deployInterestRate(deployer);

  const cether = await deployCEther(
    deployer,
    comptroller.address,
    jumpRate.address
  );
  recordCTokenAddress("eth", cether.address);

  const tUsd = await deployTestUsd(deployer);
  recordTokenAddress("test", tUsd.address);

  const ctUsd = await deployCTestUsd(
    deployer,
    tUsd.address,
    comptroller.address,
    jumpRate.address
  );
  recordCTokenAddress("test", ctUsd.address);

  const lens = await deployContract(deployer, "CompoundLens", []);
  recordMainAddress("zoroLens", lens.address);

  const maxi = await deployContract(deployer, "Maximillion", [cether.address]);
  recordMainAddress("maximillion", maxi.address);

  const multicall = await deployContract(deployer, "Multicall3", []);
  recordMainAddress("multicall", multicall.address);

  // If price is zero, the comptroller will fail to set the collateral factor
  await configurePriceOracle(priceOracle, ctUsd.address);
  await configurePriceOracle(priceOracle, cether.address);

  await addCTokenToMarket(comptroller, ctUsd.address);
  await addCTokenToMarket(comptroller, cether.address);
}
