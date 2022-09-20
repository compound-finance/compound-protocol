import { ethers } from "ethers";
import hre from "hardhat";

const cTokenAddress = ""
const amount = ethers.utils.parseUnits("1", 16);

async function main() {
    const ctoken = await hre.ethers.getContractAt(
    "CErc20Delegate",
    cTokenAddress
  );

  console.log(`calling _setVaultFees(${amount}) on ${cTokenAddress}` )
  let tx = await ctoken._setVaultFees(amount)
  console.log(tx.events)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });