import { BigNumberish, } from "ethers";
import hre from "hardhat";

// const cTokenAddress = ""
// const amount = ethers.utils.parseUnits("1", 16);

export async function _setVaultFees(cTokenAddress: string, amount: BigNumberish) {
    const ctoken = await hre.ethers.getContractAt(
    "CErc20Delegate",
    cTokenAddress
  );

  console.log(`calling _setVaultFees(${amount}) on ${cTokenAddress}` )
  let tx = await ctoken._setVaultFees(amount)
  console.log(tx.events)
}
