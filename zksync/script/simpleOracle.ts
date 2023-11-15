import { ethers } from "ethers";
import deployContract from "./contract";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { TransactionResponse } from "ethers/providers";

export async function deployTestOracle(
  deployer: Deployer
): Promise<ethers.Contract> {
  const priceOracle: ethers.Contract = await deployContract(
    deployer,
    "SimplePriceOracle",
    []
  );
  deployer.hre.recordMainAddress("oracle", priceOracle.address);

  return priceOracle;
}

export async function setTestOraclePrice(
  priceOracle: ethers.Contract,
  ctokenAddress: string,
  price: ethers.BigNumber = ethers.utils.parseEther("1")
): Promise<void> {
  console.log(`Setting price for ${ctokenAddress}`);
  const setPriceTx: TransactionResponse = await priceOracle.setUnderlyingPrice(ctokenAddress, price);
  await setPriceTx.wait();
}
