import { BigNumberish, ethers } from "ethers";
import hre from "hardhat";

let abi = ["function approve(address _spender, uint256 _value) public returns (bool success)"]

// const underlyingAddress = "0x1addd80e6039594ee970e5872d247bf0414c8903"
// const cTokenAddress = "0x1aDDD80E6039594eE970E5872D247bf0414C8903"
// const amount = ethers.utils.parseUnits("1", 16);

export async function approve(underlyingAddress: string, cTokenAddress: string, amount: BigNumberish) {
    const underlying = await hre.ethers.getContractAt(abi, underlyingAddress);

  console.log(`calling approve(${cTokenAddress}, ${amount}) on ${underlyingAddress}` )
  let tx = await underlying.approve(cTokenAddress, amount)
  console.log(tx.events)
}
