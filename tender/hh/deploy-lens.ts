import hre from "hardhat";
import { readFileSync, writeFileSync } from "fs";

const outputFilePath = `./deployments/${hre.network.name}.json`;

export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  const CompoundLens = await hre.ethers.getContractFactory("CompoundLens");
  const compoundLens = await CompoundLens.deploy();
  await compoundLens.deployed();
  console.log("CompoundLens deployed to:", compoundLens.address);

  // save data
  deployments["CompoundLens"] = compoundLens.address;
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));
}

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
