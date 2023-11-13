import { ethers } from "ethers";
import deployContract from "./contract";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { Erc20ConstructorArgs } from "../script/types";

export async function deployTestToken(deployer: Deployer): Promise<ethers.Contract> {
  const initialAmount: ethers.BigNumber = ethers.utils.parseEther("10000000");
  const tokenName: string = "TestUSD";
  const decimalUnits: number = 18;
  const tokenSymbol: string = "TEST";
  const testUsdArgs: Erc20ConstructorArgs = [
    initialAmount,
    tokenName,
    decimalUnits,
    tokenSymbol
  ];

  const tUsd: ethers.Contract = await deployContract(
    deployer,
    "contracts/core/tests/Contracts/ERC20.sol:StandardToken",
    testUsdArgs
  );

  deployer.hre.recordTokenAddress("test", tUsd.address);

  return tUsd;
}
