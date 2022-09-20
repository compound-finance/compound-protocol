import { ethers } from "ethers";
import hre from "hardhat";

const cTokenAddress = ""
const amount = ethers.utils.parseUnits("1", 16);
const borrower = ""
const cTokenCollateral = ""

async function main() {
    const ctoken = await hre.ethers.getContractAt(
    "CErc20Delegate",
    cTokenAddress
  );

  console.log(`calling liquidateBorrow(${borrower}, ${amount}, ${cTokenCollateral}) on ${cTokenAddress}` )
  let tx = await ctoken.liquidateBorrow(borrower, amount, cTokenCollateral)
  console.log(tx.events)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });