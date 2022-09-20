import { BigNumberish, ethers } from "ethers";
import hre from "hardhat";


export async function mint(cTokenAddress: string, amount: BigNumberish) {
    const ctoken = await hre.ethers.getContractAt(
    "CErc20Delegate",
    cTokenAddress
  );

  console.log(`calling mint(${amount}) on ${cTokenAddress}` )
  let tx = await ctoken.mint(amount)
  console.log(tx.events)
}


export async function borrow(cTokenAddress: string, amount: BigNumberish) {
    const ctoken = await hre.ethers.getContractAt(
    "CErc20Delegate",
    cTokenAddress
  );

  console.log(`calling borrow(${amount}) on ${cTokenAddress}` )
  let tx = await ctoken.borrow(amount)
  console.log(tx.events)
}


export async function redeem(cTokenAddress: string, amount: BigNumberish) {
    const ctoken = await hre.ethers.getContractAt(
    "CErc20Delegate",
    cTokenAddress
  );

  console.log(`calling redeem(${amount}) on ${cTokenAddress}` )
  let tx = await ctoken.redeemUnderlying(amount)
  console.log(tx.events)
}



export async function repayBorrow(cTokenAddress: string, amount: BigNumberish) {
    const ctoken = await hre.ethers.getContractAt(
    "CErc20Delegate",
    cTokenAddress
  );

  console.log(`calling repayBorrow(${amount}) on ${cTokenAddress}` )
  let tx = await ctoken.repayBorrow(amount)
  console.log(tx.events)
}


export async function liquidateBorrow(cTokenAddress: string, borrower: string, amount: BigNumberish, cTokenCollateral: string) {
    const ctoken = await hre.ethers.getContractAt(
    "CErc20Delegate",
    cTokenAddress
  );

  console.log(`calling liquidateBorrow(${borrower}, ${amount}, ${cTokenCollateral}) on ${cTokenAddress}` )
  let tx = await ctoken.liquidateBorrow(borrower, amount, cTokenCollateral)
  console.log(tx.events)
}
