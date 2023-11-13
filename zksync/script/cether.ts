import { ethers } from "ethers";
import deployContract from "./contract";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { CEtherConstructorArgs } from "../script/types";

export async function deployCEther(
  deployer: Deployer,
  comptroller: ethers.Contract,
  interestRateModel: ethers.Contract
): Promise<ethers.Contract> {
  const underlyingDecimals = 18;
  const decimals: number = 8;
  const initialExchangeRateDecimals = underlyingDecimals + 18 - decimals;
  const initialExchangeRateMantissa: ethers.BigNumber = ethers.utils.parseUnits("1", initialExchangeRateDecimals);
  const name: string = "Zoro Ether";
  const symbol: string = "cETH";
  const admin: string = deployer.zkWallet.address;
  const cetherArgs: CEtherConstructorArgs = [
    comptroller.address,
    interestRateModel.address,
    initialExchangeRateMantissa,
    name,
    symbol,
    decimals,
    admin
  ];
  const cether: ethers.Contract = await deployContract(deployer, "CEther", cetherArgs);

  deployer.hre.recordCTokenAddress("eth", cether.address);

  return cether;
}
