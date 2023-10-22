import { ethers } from "ethers";
import { getChainId } from "./utils";
import deployContract from "./deployContract";
import { recordCTokenAddress } from "../script/deployAddresses";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { CEtherConstructorArgs } from "../script/types";

export async function deployCEther(
  deployer: Deployer,
  comptroller: ethers.Contract,
  interestRateModel: ethers.Contract
): Promise<ethers.Contract> {
  const chainId: number = getChainId(deployer.hre);

  const initialExchangeRateMantissa: ethers.BigNumber = ethers.utils.parseEther("1");
  const name: string = "Zoro Ether";
  const symbol: string = "cETH";
  const decimals: number = 18;
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

  recordCTokenAddress(chainId, "eth", cether.address);

  return cether;
}
