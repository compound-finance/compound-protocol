import { ethers } from "ethers";
import { getChainId } from "./utils";
import deployContract from "./contract";
import { recordMainAddress } from "./addresses";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { TransactionResponse } from "ethers/providers";

export async function deployTestOracle(
  deployer: Deployer
): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const priceOracle: ethers.Contract = await deployContract(
    deployer,
    "SimplePriceOracle",
    []
  );
  recordMainAddress(chainId, "oracle", priceOracle.address);

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
