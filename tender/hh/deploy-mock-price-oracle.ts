import { readFileSync, writeFileSync } from "fs";
import hre from "hardhat";

const outputFilePath = `./deployments/${hre.network.name}.json`;

export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const MockFactory = await hre.ethers.getContractFactory("MockPriceOracle");
  const mockContract = await MockFactory.deploy();
  console.log("MockPriceOracle deployed to:", mockContract.address);

  // Save to output
  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  deployments["PriceOracle"] = mockContract.address;
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

  try {
    await verifyContract(
      "contracts/MockPriceOracle.sol:MockPriceOracle",
      mockContract.address,
      []
    );
  } catch (e) {
    console.error("Error verifying MockPriceOracle");
    console.error(e);
  }
}

const verifyContract = async (
  contractName: string,
  contractAddress: string,
  constructorArgs: any
) => {
  await hre.run("verify:verify", {
    contract: contractName,
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
