import { ethers } from "ethers";

export interface AddressConfig {
  [contract: string]: { [chainId: number]: string };
}

export interface DeployCTokenParams {
  underlying: string;
  exchangeRateDecimals: number;
}

export interface AddCTokenToMarketParams {
  cToken: string;
}

export interface VerifyContractParams {
  contractName: string;
  address: string;
}

export type Erc20ConstructorArgs = [
  initialAmount: ethers.BigNumber,
  tokenName: string,
  decimalUnits: number,
  tokenSymbol: string
];

export type CErc20ImmutableConstructorArgs = [
  underlying: string,
  comptroller: string,
  interestRateModel: string,
  initialExchangeRateMantissa: ethers.BigNumber,
  name: string,
  symbol: string,
  decimals: number,
  admin: string,
];

export type CEtherConstructorArgs = [
  comptroller: string,
  interestRateModel: string,
  initialExchangeRateMantissa: ethers.BigNumber,
  name: string,
  symbol: string,
  decimals: number,
  admin: string,
];

export type InterestRateArgs = [
  ethers.BigNumber,
  ethers.BigNumber,
  ethers.BigNumber,
  ethers.BigNumber,
  string
];

export type DeployReturn = {
  comptroller: ethers.Contract,
  cEther: ethers.Contract,
  cTokens: ethers.Contract[]
};
