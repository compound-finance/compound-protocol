import { readFileSync, writeFileSync } from "fs";
import hre from "hardhat";

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
} 

const outputFilePath = `./deployments/${hre.network.name}.json`;

export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  // const MockFactory = await hre.ethers.getContractFactory("contracts/MockPriceOracle.sol:MockPriceOracle");
  // const mockContract = await MockFactory.deploy();
  // console.log("MockPriceOracle deployed to:", mockContract.address);

  // Save to output
  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  // deployments["PriceOracle"] = mockContract.address;
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

  await delay(5000);

  try {
    await verifyContract(
      "contracts/MockPriceOracle.sol:MockPriceOracle",
      "0xc2E597bec496ed2c4b8D9fFaF9e01346ba20ceB5", //mockContract.address,
    );
  } catch (e) {
    console.error("Error verifying MockPriceOracle");
    console.error(e);
  }
}

const verifyContract = async (
  contractName: string,
  contractAddress: string,
) => {
  await hre.run("verify:verify", {
    contract: contractName,
    address: contractAddress,
  });
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
