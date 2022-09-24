import { BigNumberish, ethers } from "ethers";
import hre from "hardhat";

// const cTokenAddress = ""
// const amount = ethers.utils.parseUnits("1", 16);
// const borrower = ""
// const cTokenCollateral = ""

export async function liquidateBorrow(cTokenAddress: string, borrower: string, amount: BigNumberish, cTokenCollateral: string) {
    const ctoken = await hre.ethers.getContractAt(
    "CErc20Delegate",
    cTokenAddress
  );

  console.log(`calling liquidateBorrow(${borrower}, ${amount}, ${cTokenCollateral}) on ${cTokenAddress}` )
  let tx = await ctoken.liquidateBorrow(borrower, amount, cTokenCollateral)
  console.log(tx.events)
}
