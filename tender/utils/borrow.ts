import { BigNumberish, ethers } from "ethers";
import hre from "hardhat";

// const cTokenAddress = ""
// const amount = ethers.utils.parseUnits("1", 16);

export async function borrow(cTokenAddress: string, amount: BigNumberish) {
    const ctoken = await hre.ethers.getContractAt(
    "CErc20Delegate",
    cTokenAddress
  );

  console.log(`calling borrow(${amount}) on ${cTokenAddress}` )
  let tx = await ctoken.borrow(amount)
  console.log(tx.events)
}
