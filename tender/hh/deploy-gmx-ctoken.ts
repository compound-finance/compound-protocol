import hre from "hardhat";
import { numToWei } from "../utils/ethUnitParser";

import { readFileSync, writeFileSync } from "fs";
import { GMX } from "./CTOKENS"

const outputFilePath = `./deployments/${hre.network.name}.json`;



export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  const unitrollerAddress: string = deployments.Unitroller;
  const irModelAddress: string = deployments.IRModels.JumpRateModelV2;

  const unitrollerProxy = await hre.ethers.getContractAt(
    "Comptroller",
    unitrollerAddress
  );

  const adminAddress = await unitrollerProxy.admin()

  const delegatorFactory = await hre.ethers.getContractFactory(
    "CErc20DelegatorGmx"
  );
  const CErc20Delegate = await  hre.ethers.getContractFactory("CErc20DelegateGmx");
  let token = GMX;

  const erc20Underlying = await hre.ethers.getContractAt(
    "EIP20Interface",
    token.underlying
  );
  const underlyingDecimals = await erc20Underlying.decimals();
  const totalDecimals = underlyingDecimals + token.decimals;
  const initialExcRateMantissaStr = numToWei("2", totalDecimals);

  console.log("deploying delegate")
  const deployedCErc20Delegate = await CErc20Delegate.deploy()
  const delegateAddress = deployedCErc20Delegate.address

  console.log("deployed CErc20Delegate", delegateAddress)

  console.log(
      "Calling delegatorFactory.deploy() with",
      token.underlying,
      unitrollerAddress,
      irModelAddress,
      initialExcRateMantissaStr,
      token.name,
      token.symbol,
      token.decimals,
      adminAddress,
      delegateAddress,
      Buffer.from([0x0]),
    )

  const delegator = await delegatorFactory.deploy(
      token.underlying,
      unitrollerAddress,
      irModelAddress,
      initialExcRateMantissaStr,
      token.name,
      token.symbol,
      token.decimals,
      adminAddress,
      delegateAddress,
      Buffer.from([0x0]),
  );

  await delegator.deployed();
  console.log("delegator deployed to:", delegator.address);

  try {
    await verifyContract("contracts/CErc20DelegatorGmx.sol:CErc20DelegatorGmx", delegator.address, [
      token.underlying,
      unitrollerAddress,
      irModelAddress,
      initialExcRateMantissaStr,
      token.name,
      token.symbol,
      token.decimals,
      adminAddress,
      delegateAddress,
      Buffer.from([0x0]),
    ]);
  } catch (e) {
    console.error("Error verifying delegator");
    console.error(e);
  }

  console.log("calling unitrollerProxy._supportMarket()");

  let isPrivate = false
  let isComped = true
  let onlyWhitelistedBorrow = false
  await unitrollerProxy._supportMarket(delegator.address, isComped, isPrivate, onlyWhitelistedBorrow);

  console.log("calling unitrollerProxy._setFactorsAndThresholds()")

  await unitrollerProxy._setFactorsAndThresholds(
    delegator.address, token.collateralFactor, token.collateralVIP, token.threshold, token.thresholdVIP);

  // Save to output
  deployments[`${token.symbol}_delegate`] = delegateAddress;
  deployments[token.symbol] = delegator.address;
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

}


const verifyContract = async (
  contract: string,
  contractAddress: string,
  constructorArgs: any
) => {
  await hre.run("verify:verify", {
    contract,
    address: contractAddress,
    constructorArguments: constructorArgs,
  });
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
