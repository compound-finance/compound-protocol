import { readFileSync, writeFileSync } from "fs";
import hre from "hardhat";

const outputFilePath = `./deployments/${hre.network.name}.json`;

export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));

  const Factory = await hre.ethers.getContractFactory("GMXPriceOracle");
  const GMXPriceOracle = await Factory.deploy();
  console.log("GMXPriceOracle deployed to:", GMXPriceOracle.address);

  // Save to output
  deployments["PriceOracle"] = GMXPriceOracle.address;
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

  try {
    await verifyContract(GMXPriceOracle.address);
  } catch (e) {
    console.error("Error verifying GMXPriceOracle");
    console.error(e);
  }

  if (deployments.Unitroller) {
    console.log(
        "calling unitrollerProxy._setPriceOracle() with address",
        GMXPriceOracle.address
      );
    
      const unitrollerProxy = await hre.ethers.getContractAt(
        "Comptroller",
        deployments.Unitroller
      );
      let _tx = await unitrollerProxy._setPriceOracle(deployments.PriceOracle);
      await _tx.wait();
  } else {
      console.warn("did not set oracle on unitroller")
  }


}

const verifyContract = async (
    contractAddress: string,
  ) => {
    await hre.run("verify:verify", {
      contract: "contracts/GMXPriceOracle.sol:GMXPriceOracle",
      address: contractAddress,
    });
  };
  

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
