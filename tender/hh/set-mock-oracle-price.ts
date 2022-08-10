import hre from "hardhat";
import { readFileSync } from "fs";
import { ethers } from "ethers";
import { CTOKENS } from "./deploy-ctoken";

const outputFilePath = `./deployments/${hre.network.name}.json`;

const OracleAbi = [`function mockUpdatePrice(address, uint) external`];

export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));

  const unitrollerProxy = await hre.ethers.getContractAt(
    "Comptroller",
    deployments.Unitroller
  );
  const oracleAddr = await unitrollerProxy.oracle();

  const oracle = new hre.ethers.Contract(
    oracleAddr,
    OracleAbi,
    hre.ethers.provider.getSigner()
  );

  for (let i = 0; i < CTOKENS.length; i++) {
    let cToken = CTOKENS[i];
    let address = deployments[cToken.symbol];
    let value = cToken.priceInUsd;

    console.log("Setting MockOracle price on", cToken.symbol, address, value);

    let tx = await oracle.mockUpdatePrice(
      address,
      ethers.utils.parseUnits(value, 18)
    );

    let confirmations = hre.network.name === "metis" ? 3 : 1;

    await tx.wait(confirmations);
  }
}

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
