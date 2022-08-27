import hre from "hardhat";
import { numToWei } from "../utils/ethUnitParser";

import { readFileSync, writeFileSync } from "fs";
import {CTOKENS} from "./CTOKENS"

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
    "CErc20Delegator"
  );

for (let i = 0; i < CTOKENS.length; i++) {
    let token = CTOKENS[i];

    const erc20Underlying = await hre.ethers.getContractAt(
      "EIP20Interface",
      token.underlying
    );
    const underlyingDecimals = await erc20Underlying.decimals();
    const totalDecimals = underlyingDecimals + token.decimals;
    const initialExcRateMantissaStr = numToWei("2", totalDecimals);

    const delegateAddress = deployments["delegate"]
    console.log("delegate address", delegateAddress)

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
        token.isGLP === true,
        adminAddress,
        delegateAddress,
        Buffer.from([0x0]),
    );

    await delegator.deployed();
    console.log("delegator deployed to:", delegator.address);

    try {
      await verifyContract("contracts/CErc20Delegator.sol:CErc20Delegator", delegator.address, [
        token.underlying,
        unitrollerAddress,
        irModelAddress,
        initialExcRateMantissaStr,
        token.name,
        token.symbol,
        token.decimals,
        token.isGLP === true,
        adminAddress,
        delegateAddress,
        Buffer.from([0x0]),
      ]);
    } catch (e) {
      console.error("Error verifying delegator");
      console.error(e);
    }

    if (token.isGLP) {
        console.log("calling ctoken._setStakedGlpAddress()");
        await delegator._setStakedGlpAddress("0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE"),
        console.log("calling ctoken._setRewardRouterAddress()");
        await delegator._setRewardRouterAddress("0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1")
    }


    console.log("calling unitrollerProxy._supportMarket()");
    await unitrollerProxy._supportMarket(delegator.address, true, token.isGLP === true);

    console.log("calling unitrollerProxy._setCollateralFactor()");
    await unitrollerProxy._setCollateralFactor(delegator.address, token.collateralFactor);

    // Save to output
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
