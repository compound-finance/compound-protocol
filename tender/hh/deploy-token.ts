import hre from "hardhat";
import { readFileSync, writeFileSync } from "fs";

const outputFilePath = `./deployments/${hre.network.name}.json`;

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));

  const Comp = await hre.ethers.getContractFactory("Comp");
  const comp = await Comp.deploy(deployer.address);
  await comp.deployed();
  console.log("Comp deployed to:", comp.address);

  // save data
  deployments["TESTIES"] = comp.address;
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));
}

// main()
//   .then(() => process.exit(0))
//   .catch(error => {
//     console.error(error);
//     process.exit(1);
//   });
