import { ethers } from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { TaskArguments } from "hardhat/types";
import { ZkSyncArtifact } from "@matterlabs/hardhat-zksync-deploy/dist/types";

export default async function deployContract(
  deployer: Deployer,
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[],
  verify: boolean = true
): Promise<ethers.Contract> {
  const artifact: ZkSyncArtifact = await deployer.loadArtifact(name);

  // Estimate contract deployment fee
  const deploymentFee: ethers.BigNumber = await deployer.estimateDeployFee(
    artifact,
    args
  );

  const parsedFee: string = ethers.utils.formatEther(deploymentFee.toString());
  console.log(`The deployment is estimated to cost ${parsedFee} ETH`);

  const contract: ethers.Contract = await deployer.deploy(artifact, args);

  //obtain the Constructor Arguments
  console.log("constructor args:" + contract.interface.encodeDeploy(args));

  // Show the contract info.
  console.log(`${artifact.contractName} was deployed to ${contract.address}`);

  if (verify && "verifyURL" in deployer.hre.network.config) {
    // Verify contract programmatically

    const contractFullyQualifedName: string = `${artifact.sourceName}:${artifact.contractName}`;

    const verificationArgs: TaskArguments = {
      address: contract.address,
      contract: contractFullyQualifedName,
      constructorArguments: args
    };

    const verificationId: number = await deployer.hre.run(
      "verify:verify",
      verificationArgs
    );

    console.log(
      `${contractFullyQualifedName} verified! VerificationId: ${verificationId}`
    );
  }

  return contract;
}
