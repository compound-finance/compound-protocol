import { utils } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

async function deployContract(deployer: Deployer, name:string, args:Array) {
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
}

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for Zoro Protocol`);

  const wallet = hre.zkWallet;

  // Create deployer object and load the artifact of the contract you want to deploy.
  const deployer = new Deployer(hre, wallet);

  // OPTIONAL: Deposit funds to L2
  // Comment this block if you already have funds on zkSync.
  // const depositHandle = await deployer.zkWallet.deposit({
  //   to: deployer.zkWallet.address,
  //   token: utils.ETH_ADDRESS,
  //   amount: deploymentFee.mul(2),
  // });
  // Wait until the deposit is processed on zkSync
  // await depositHandle.wait();

  // Deploy this contract. The returned object will be of a `Contract` type, similarly to ones in `ethers`.
  // `greeting` is an argument for contract constructor.

  await deployContract(deployer, "Comptroller", []);

  // 5% base rate and 20% + 5% interest at kink and 200% multiplier starting at the kink of 90% utilization
  const baseRatePerYear:BigNumber = ethers.utils.parseEther("0.05");
  const multiplierPerYear:BigNumber = ethers.utils.parseEther("0.2");
  const jumpMultiplierPerYear:BigNumber = ethers.utils.parseEther("2");
  const kink:BigNumber = ethers.utils.parseEther("0.9");
  const owner:string = wallet.address;

  const interestRateArgs:Array = [
      baseRatePerYear,
      multiplierPerYear,
      jumpMultiplierPerYear,
      kink,
      owner,
  ];
  await deployContract(deployer, "JumpRateModelV2", interestRateArgs);

  const initialAmount = ethers.utils.parseEther("10000000");
  const tokenName = "TestUSD";
  const decimalUnits = 18;
  const tokenSymbol = "TEST";
  const testUsdArgs:Array = [
      initialAmount,
      tokenName,
      decimalUnits,
      tokenSymbol,
  ];
  await deployContract(deployer, "contracts/test/ERC20.sol:StandardToken", testUsdArgs);

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
}

