import hre from "hardhat";
import { readFileSync, writeFileSync } from "fs";
const outputFilePath = `./deployments/${hre.network.name}.json`;

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  const unitrollerAddr = deployments["Unitroller"];
  const Comptroller = await hre.ethers.getContractFactory("Comptroller");
  const comptroller = await Comptroller.deploy();
  await comptroller.deployed();
  console.log("Comptroller deployed to:", comptroller.address);

  console.log("calling unitroller._setPendingImplementation()");
  const unitroller = await hre.ethers.getContractAt("Unitroller", unitrollerAddr);
  let _tx = await unitroller._setPendingImplementation(comptroller.address);
  console.log(`Tx: ${_tx.hash}`);
  await _tx.wait(3);

  console.log("calling comptroller._become()");
  _tx = await comptroller._become(unitrollerAddr);
  console.log(`Tx: ${_tx.hash}`);
  await _tx.wait(3);

  // save data
  deployments["Comptroller"] = comptroller.address;
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

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

  await verifyContract(
    "contracts/Comptroller.sol:Comptroller",
    comptroller.address,
    []
  );

}

// main()
//   .then(() => process.exit(0))
//   .catch(error => {
//     console.error(error);
//     process.exit(1);
//   });