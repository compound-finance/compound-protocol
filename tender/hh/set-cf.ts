import hre, { ethers } from "hardhat";

import { readFileSync } from "fs";
import { CTOKENS } from "./CTOKENS"

const outputFilePath = `./deployments/${hre.network.name}.json`;

// NOTE: we need to set collateral factors after the price oracle


export async function main() {
  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));

  const unitrollerAddress: string = deployments.Unitroller;

  const unitrollerProxy = await hre.ethers.getContractAt(
    "Comptroller",
    unitrollerAddress
  );

  for (let i = 0; i < CTOKENS.length; i++) {
    let cToken = CTOKENS[i];
    let address = deployments[cToken.symbol];
    let collateralFactor = cToken.collateralFactor; 

    console.log(
      `Calling unitrollerProxy._setCollateralFactor(${address}, ${collateralFactor})`
    );

    let tx = await unitrollerProxy._setCollateralFactor(
      address,
      collateralFactor
    );
    let rc = await tx.wait();
    console.log(rc.events);
  }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
