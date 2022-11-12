import hre from "hardhat";
import { numToWei } from "../utils/ethUnitParser";
import { toBn } from "../utils/bn";

// IR Model Params
// const params = {
//   address: "0x49c67df0d856785739a2e454aa4921d63a51be13",
//   blocksPerYear: "2628000",
//   baseRate: "6.77",
//   kink: "90",
//   multiplierPreKink: "0",
//   multiplierPostKink: "40.57",
// };

const params = {
  address: "0x9dEB4B6fd089eD03ceFB64549EAEB06e60C0c6BE",
  blocksPerYear: "2628000",
  baseRate: "11.333",
  kink: "90",
  multiplierPreKink: "0",
  multiplierPostKink: "40.57",
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Account: ${deployer.address} <<<<<<<<<<<<\n`);

  const jumpMultiplier = getJumpMultiplier(
    params.kink,
    params.multiplierPreKink,
    params.multiplierPostKink
  );

  const baseRateWei = numToWei(toBn(params.baseRate).div(100), 18);
  const kinkWei = numToWei(toBn(params.kink).div(100), 18);
  const multiplierWei = numToWei(toBn(params.multiplierPreKink).div(100), 18);
  const jumpMultiplierWei = numToWei(toBn(jumpMultiplier).div(100), 18);

  const jumpRateModelV2 = await hre.ethers.getContractAt(
    "JumpRateModelV2",
    params.address
  );
  const tx = await jumpRateModelV2.updateJumpRateModel(
    baseRateWei,
    multiplierWei,
    jumpMultiplierWei,
    kinkWei
  );
  await tx.wait();

  console.log(`JumpRateModelV2 updated in txn: ${tx.hash}.`);
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

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
