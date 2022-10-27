import hre from "hardhat";
import { ethers } from "ethers";

import { readFileSync, writeFileSync } from "fs";

const outputFilePath = `./deployments/${hre.network.name}.json`;

const CTOKEN_DECIMALS = 8;

const collateralFactor = ethers.utils.parseUnits("70", 16);
const collateralVIP = ethers.utils.parseUnits("85", 16);
const threshold = ethers.utils.parseUnits("75", 16);
const thresholdVIP = ethers.utils.parseUnits("90", 16);
const isComped = false 
const isPrivate = false
const onlyWhitelistedBorrow = false


export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  const unitrollerAddress: string = deployments.Unitroller;
  const irModelAddress: string = deployments.IRModels.JumpRateModelV2;
  const initialExcRateMantissaStr = "200000000000000000000000000"

  const CEtherFactory = await hre.ethers.getContractFactory("CEther");
  const unitrollerProxy = await hre.ethers.getContractAt("Comptroller", unitrollerAddress);

  const CEther = await CEtherFactory.deploy(
    unitrollerAddress,
    irModelAddress,
    initialExcRateMantissaStr,
    "tETH",
    "tETH",
    CTOKEN_DECIMALS,
    deployer.address,
    false
  );
  await CEther.deployed();
  console.log("tEth deployed to:", CEther.address);

  // Save to output
  deployments["tEth"] = CEther.address;
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

  await unitrollerProxy._supportMarket(CEther.address, isComped, isPrivate, onlyWhitelistedBorrow);
  await CEther.deployTransaction.wait(1);

  try {
    await verifyContract(CEther.address, [
      unitrollerAddress,
      irModelAddress,
      initialExcRateMantissaStr,
      "tETH",
      "tETH",
      8,
      deployer.address,
      false
    ]);
  } catch (e) {
    console.error(e);
  }


  console.log("calling unitrollerProxy._setFactorsAndThresholds()");
  let tx = await unitrollerProxy._setFactorsAndThresholds(
    CEther.address, collateralFactor, collateralVIP, threshold, thresholdVIP)
  console.log(tx, tx.events);

}

const verifyContract = async (
  contractAddress: string,
  constructorArgs: any
) => {
  await hre.run("verify:verify", {
    contract: "contracts/CEther.sol:CEther",
    address: contractAddress,
    constructorArguments: constructorArgs,
  });
};

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
