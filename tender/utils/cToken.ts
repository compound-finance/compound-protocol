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

export async function getAccountSnapshot(cTokenAddress: string, account: string) {
  const ctoken = await hre.ethers.getContractAt(
  "CErc20Delegate",
  cTokenAddress
);

console.log(`checking accountSnapshot for account(${account} on ${cTokenAddress}` )
let tx = await ctoken.getAccountSnapshot(account)
console.log(tx)
}

export async function getAccountLiquidity(comptrollerAddress: string, account: string) {
  const ctoken = await hre.ethers.getContractAt(
  "Comptroller",
  comptrollerAddress
);

console.log(`checking account Liquidity for account(${account} on ${comptrollerAddress}` )
let tx = await ctoken.getAccountLiquidity(account)
console.log(tx)
}

export async function setFactorsAndThresholds(unitrollerAddress: string, cTokenAddress: string, CF: BigNumberish, CFVIP: BigNumberish, LT: BigNumberish, LTVIP: BigNumberish) {
  const unitroller = await hre.ethers.getContractAt(
  "Comptroller",
  unitrollerAddress
);

console.log(`setting factors and thresholds for (${cTokenAddress} to ${CF}, ${CFVIP}, ${LT}, ${LTVIP}` )
let tx = await unitroller._setFactorsAndThresholds(cTokenAddress, CF, CFVIP, LT, LTVIP)
console.log(tx)
}

export async function readMarketData(unitrollerAddress: string, cTokenAddress: string) {
  const unitroller = await hre.ethers.getContractAt(
  "Comptroller",
  unitrollerAddress
);

console.log(`getting factors and thresholds for (${cTokenAddress}` )
let tx = await unitroller.markets(cTokenAddress)
console.log(tx)
}

export async function readBorrowAllowed(unitrollerAddress: string, cTokenAddress: string, callerAddress: string, amount: BigNumberish) {
  const unitroller = await hre.ethers.getContractAt(
  "Comptroller",
  unitrollerAddress
);

console.log(`getting borrowAllowed for user ${callerAddress} on market ${cTokenAddress}  for amount ${amount}` )
let tx = await unitroller.borrowAllowed(cTokenAddress, callerAddress, amount)
console.log(tx.value)
}


export async function getHypotheticalAccountLiquidity(comptrollerAddress: string, cTokenAddress: string, account: string, redeemTokens: BigNumberish, borrowAmount: BigNumberish) {
  const ctoken = await hre.ethers.getContractAt(
  "Comptroller",
  comptrollerAddress
);

console.log(`checking account Liquidity for account(${account} on ${comptrollerAddress}` )
let tx = await ctoken.getHypotheticalAccountLiquidity(account, cTokenAddress, redeemTokens, borrowAmount,)
console.log(tx)
}
