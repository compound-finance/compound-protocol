import hre from "hardhat";
import { numToWei } from "../utils/ethUnitParser";

import { readFileSync, writeFileSync } from "fs";
import '@openzeppelin/hardhat-upgrades';
import {CTOKENS} from "./CTOKENS"

const outputFilePath = `./deployments/${hre.network.name}.json`;


export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const implementation = await  hre.ethers.getContractFactory(
    "CErc20Delegate"
  );

  const delegatorFactory = await hre.ethers.getContractFactory(
    "CErc20Delegator"
  );

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  const unitrollerAddress: string = deployments.Unitroller;
  // TODO: This is fragile if the parameters change
  const irModelAddress: string =
    deployments.IRModels.JumpRateModelV2["0__80__50__1000"];

    const unitrollerProxy = await hre.ethers.getContractAt(
        "Comptroller",
        unitrollerAddress
      );

    const adminAddress = await unitrollerProxy.admin()
    console.log("ADMIN", adminAddress)
  
  for (let i = 0; i < CTOKENS.length; i++) {
    let token = CTOKENS[i];

    const erc20Underlying = await hre.ethers.getContractAt(
      "EIP20Interface",
      token.underlying
    );
    const underlyingDecimals = await erc20Underlying.decimals();
    const totalDecimals = underlyingDecimals + token.decimals;
    const initialExcRateMantissaStr = numToWei("2", totalDecimals);

    const deployedImpl = await implementation.deploy()
    console.log("deployed implementation", deployedImpl.address)


    console.log(
        "Calling delegatorFactory.deploy() with",
        token.underlying,
        unitrollerAddress,
        irModelAddress,
        initialExcRateMantissaStr,
        token.name,
        token.symbol,
        token.decimals,
        token.isGLP === true,
        adminAddress,
        deployedImpl.address,
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
        token.isGLP === true,
        adminAddress,
        deployedImpl.address,
        Buffer.from([0x0]),
    );

    await delegator.deployed();
    console.log("delegator deployed to:", delegator.address);


    //  These are all the same so they don't need to be veriffied again.
    // try {
    //     await hre.run("verify:verify", {
    //         contract: "contracts/CErc20Delegate.sol:CErc20Delegate",
    //         address: deployedImpl.address,
    //     })
    //   } catch (e) {
    //     console.error("Error verifying delegate", deployedImpl.address);
    //     console.error(e);
    //   }
  

    try {
      verifyContract("contracts/CErc20Delegator.sol:CErc20Delegator", delegator.address, [
        token.underlying,
        unitrollerAddress,
        irModelAddress,
        initialExcRateMantissaStr,
        token.name,
        token.symbol,
        token.decimals,
        token.isGLP === true,
        adminAddress,
        deployedImpl.address,
        Buffer.from([0x0]),
      ]);
    } catch (e) {
      console.error("Error verifying delegator");
      console.error(e);
    }

    if (token.isGLP) {
        console.log("calling ctoken._setStakedGlpAddress()");
        await delegator._setStakedGlpAddress("0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE")
        console.log("calling ctoken._setRewardRouterAddress()");
        await delegator._setRewardRouterAddress("0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1")
    }


    console.log("calling unitrollerProxy._supportMarket()");

    await unitrollerProxy._supportMarket(delegator.address, true, token.isGLP === true);

    await delegator.deployTransaction.wait(1);

    console.log("calling unitrollerProxy._setCollateralFactor()");
    await unitrollerProxy._setCollateralFactor(delegator.address, token.collateralFactor);


    // Save to output
    deployments[token.symbol + "_" + "implementation"]  = deployedImpl.address
    deployments[token.symbol] = delegator.address;
    writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

  }

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
