import hre from "hardhat";
import { readFileSync, writeFileSync } from "fs";
import { numToWei } from "../utils/ethUnitParser";
import { toBn } from "../utils/bn";

const outputFilePath = `./deployments/${hre.network.name}.json`;

// IR Model Params
const params = {
  blocksPerYear: "14000000",
  baseRate: "10",
  kink: "80",
  multiplierPreKink: "1",
  multiplierPostKink: "2",
};
// see https://parasset2021-55646.medium.com/lending-protocol-interest-rate-model-comparison-48ff226f6e91

export async function main(adminWallet: string) {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));

  const jumpMultiplier = getJumpMultiplier(
    params.kink,
    params.multiplierPreKink,
    params.multiplierPostKink
  );

  const baseRateWei = numToWei(toBn(params.baseRate).div(100), 18);
  const kinkWei = numToWei(toBn(params.kink).div(100), 18);
  const multiplierWei = numToWei(toBn(params.multiplierPreKink).div(100), 18);
  const jumpMultiplierWei = numToWei(toBn(jumpMultiplier).div(100), 18);

  const JumpRateModelV2 = await hre.ethers.getContractFactory("JumpRateModelV2");
  const jumpRateModelV2 = await JumpRateModelV2.deploy(
    // params.blocksPerYear,
    baseRateWei,
    multiplierWei,
    jumpMultiplierWei,
    kinkWei,
    adminWallet
  );
  await jumpRateModelV2.deployed();

  console.log(`JumpRateModelV2 deployed to: ${jumpRateModelV2.address}.`);

  try {
    console.log(`Verifying JumpRateModelV2 deployed to: ${jumpRateModelV2.address}.`);

    await verifyContract(jumpRateModelV2.address, [
      baseRateWei,
      multiplierWei,
      jumpMultiplierWei,
      kinkWei,
      adminWallet
    ]);
  } catch (e) {
    console.error("Error verifying JumpRateModelV2", jumpRateModelV2.address);
    console.error(e);
  }

  // save data
  if (!deployments["IRModels"]) deployments["IRModels"] = {};
  if (!deployments["IRModels"]["JumpRateModelV2"]) deployments["IRModels"]["JumpRateModelV2"] = {};

  deployments["IRModels"]["JumpRateModelV2"] = jumpRateModelV2.address;
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));
}

const getJumpMultiplier = (
  kink: string,
  multiplierPreKink: string,
  multiplierPostKink: string
): string => {
  return toBn(multiplierPostKink)
    .minus(multiplierPreKink)
    .div(toBn(100).minus(kink))
    .times(100)
    .toFixed();
};

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });

const verifyContract = async (
  contractAddress: string,
  constructorArgs: any
) => {
  await hre.run("verify:verify", {
    contract: "contracts/JumpRateModelV2.sol:JumpRateModelV2",
    address: contractAddress,
    constructorArguments: constructorArgs,
  });
};