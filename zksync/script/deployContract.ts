import * as ethers from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export default async function deployContract(deployer: Deployer, name:string, args:Array) {
  const artifact = await deployer.loadArtifact(name);

  // Estimate contract deployment fee
  const deploymentFee = await deployer.estimateDeployFee(artifact, args);

  const parsedFee = ethers.utils.formatEther(deploymentFee.toString());
  console.log(`The deployment is estimated to cost ${parsedFee} ETH`);

  const contract = await deployer.deploy(artifact, args);

  //obtain the Constructor Arguments
  console.log("constructor args:" + contract.interface.encodeDeploy(args));

  // Show the contract info.
  const contractAddress = contract.address;
  console.log(`${artifact.contractName} was deployed to ${contractAddress}`);

  // Verify contract programmatically 
  //
  // Contract MUST be fully qualified name (e.g. path/sourceName:contractName)
  // const contractFullyQualifedName = "contracts/Comptroller.sol:Comptroller";
  // const verificationId = await hre.run("verify:verify", {
  //   address: contractAddress,
  //   contract: contractFullyQualifedName,
  //   constructorArguments: [],
  //   bytecode: artifact.bytecode,
  // });
  // console.log(`${contractFullyQualifedName} verified! VerificationId: ${verificationId}`)

  return contract;
}
