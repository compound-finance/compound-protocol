import hre from "hardhat";
import { numToWei } from "../utils/ethUnitParser";
import { ethers } from "ethers";

import { readFileSync, writeFileSync } from "fs";

const outputFilePath = `./deployments/${hre.network.name}.json`;

const CTOKEN_DECIMALS = 8;

export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const CEtherFactory = await hre.ethers.getContractFactory("CEther");

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));

  const unitrollerAddress: string = deployments.Unitroller;
  // TODO: This is fragile if the parameters change
  const irModelAddress: string =
    deployments.IRModels.JumpRateModelV2["0__80__50__1000"];
    const initialExcRateMantissaStr = "200000000000000000000000000"

    // const CEther = await CEtherFactory.deploy(
    //   unitrollerAddress,
    //   irModelAddress,
    //   initialExcRateMantissaStr,
    //   "tETH",
    //   "tETH",
    //   CTOKEN_DECIMALS,
    //   deployer.address,
    //   false
    // );
    // await CEther.deployed();
    // console.log("tEth deployed to:", CEther.address);

      // Save to output
      // deployments["tEth"] = CEther.address;
      // writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

    const unitrollerProxy = await hre.ethers.getContractAt(
      "Comptroller",
      unitrollerAddress
    );

    // console.log("calling unitrollerProxy._supportMarket()");

    // await unitrollerProxy._supportMarket(CEther.address, false, false);
    // await CEther.deployTransaction.wait(1);

    try {
      await verifyContract("0x7C0beDaF3aD27E50dF2810B4611B5222e12696Dc", [
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
    //   console.error("Error verifying Tether", CEther.address);
      console.error(e);
    }



    console.log("calling unitrollerProxy._setCollateralFactor()");
    await unitrollerProxy._setCollateralFactor("0x7C0beDaF3aD27E50dF2810B4611B5222e12696Dc", ethers.utils.parseUnits(".8e16"));
    // await CEther.deployTransaction.wait(1);

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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
