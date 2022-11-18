import hre from "hardhat";
import "@nomiclabs/hardhat-ethers"
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

export async function deployComptroller(deploymentFp) {
  const outputFilePath = resolve(
    __dirname,
    `../../../deployments/${hre.network.name}.json`
  );
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
  const adminAddress = await unitroller.admin();
  const admin = await hre.ethers.getImpersonatedSigner(adminAddress);
  let _tx = await unitroller.connect(admin)._setPendingImplementation(comptroller.address);
  _tx = await comptroller.connect(admin)._become(unitrollerAddr);
  // save data
  deployments["Comptroller"] = comptroller.address;
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));
  return unitroller;
}
