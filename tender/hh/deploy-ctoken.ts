import hre from "hardhat";
import { numToWei } from "../utils/ethUnitParser";

import { readFileSync, writeFileSync } from "fs";
import { ethers } from "ethers";
import { CTOKENS} from "./CTOKENS"

const outputFilePath = `./deployments/${hre.network.name}.json`;



export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const CErc20Immutable = await hre.ethers.getContractFactory(
    "CErc20Immutable"
  );

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  // const comptrollerAddress: string = deployments.Comptroller;
  const unitrollerAddress: string = deployments.Unitroller;
  // TODO: This is fragile if the parameters change
  const irModelAddress: string =
    deployments.IRModels.JumpRateModelV2["0__80__50__1000"];

  for (let i = 0; i < CTOKENS.length; i++) {
    let token = CTOKENS[i];
    if (token.symbol === "tETH") continue; // tETh is another script
    console.log("deplying ctoken for", token.symbol)

    const erc20Underlying = await hre.ethers.getContractAt(
      "EIP20Interface",
      token.underlying
    );
    const underlyingDecimals = await erc20Underlying.decimals();
    const totalDecimals = underlyingDecimals + token.decimals;
    const initialExcRateMantissaStr = numToWei("2", totalDecimals);

    const cErc20Immutable = await CErc20Immutable.deploy(
      token.underlying,
      unitrollerAddress,
      irModelAddress,
      initialExcRateMantissaStr,
      token.name,
      token.symbol,
      token.decimals,
      token.isGLP === true,
      deployer.address,
    );
    await cErc20Immutable.deployed();
    console.log("CErc20Immutable deployed to:", cErc20Immutable.address);

    if (token.isGLP) {
      console.log("calling ctoken._setStakedGlpAddress()");
      await cErc20Immutable._setStakedGlpAddress("0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE")
      console.log("calling ctoken._setRewardRouterAddress()");
      await cErc20Immutable._setRewardRouterAddress("0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1")
    }

    const unitrollerProxy = await hre.ethers.getContractAt(
      "Comptroller",
      unitrollerAddress
    );

    console.log("calling unitrollerProxy._supportMarket()");

    await unitrollerProxy._supportMarket(cErc20Immutable.address, true, false); // 

    console.log("calling unitrollerProxy._setCollateralFactor()");
    await unitrollerProxy._setCollateralFactor(cErc20Immutable.address, token.collateralFactor);

    let confirmations = hre.network.name === "metis" ? 5 : 1;
    await cErc20Immutable.deployTransaction.wait(confirmations);

    // Save to output
    deployments[token.symbol] = cErc20Immutable.address;
    writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

    try {
      await verifyContract(cErc20Immutable.address, [
        token.underlying,
        unitrollerAddress,
        irModelAddress,
        initialExcRateMantissaStr,
        token.name,
        token.symbol,
        token.decimals,
        token.isGLP === true,
        deployer.address,
      ]);
    } catch (e) {
      console.error("Error verifying cErc20Immutable", cErc20Immutable.address);
      console.error(e);
    }
  }
}

const verifyContract = async (
  contractAddress: string,
  constructorArgs: any
) => {
  await hre.run("verify:verify", {
    contract: "contracts/CErc20Immutable.sol:CErc20Immutable",
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
