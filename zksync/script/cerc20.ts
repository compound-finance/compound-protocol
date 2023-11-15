import { ethers } from "ethers";
import deployContract from "./contract";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { CErc20ImmutableConstructorArgs } from "./types";

export async function deployCErc20(
  deployer: Deployer,
  underlyingAddr: string,
  comptrollerAddress: string,
  interestRateModel: string,
): Promise<ethers.Contract> {
  const underlying: ethers.Contract = await deployer.hre.ethers.getContractAt(
    "EIP20Interface",
    underlyingAddr,
    deployer.zkWallet
  );

  const underlyingName: string = await underlying.name();
  const name: string = `Zoro ${underlyingName}`;

  const underlyingSymbol: string = await underlying.symbol();
  const symbol: string = `z${underlyingSymbol}`;

  const decimals: number = 8;
  const underlyingDecimals: number = await underlying.decimals();
  const initialExchangeRateDecimals: number = underlyingDecimals + 18 - decimals;
  const initialExchangeRateMantissa: ethers.BigNumber = ethers.utils.parseUnits(
    "1",
    initialExchangeRateDecimals
  );

  const admin: string = deployer.zkWallet.address;

  const cTokenArgs: CErc20ImmutableConstructorArgs = [
    underlyingAddr,
    comptrollerAddress,
    interestRateModel,
    initialExchangeRateMantissa,
    name,
    symbol,
    decimals,
    admin
  ];

  const cToken: ethers.Contract = await deployContract(
    deployer,
    "CErc20Immutable",
    cTokenArgs
  );

  return cToken;
}
