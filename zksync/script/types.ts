import { ethers } from "ethers";

export interface DeployConfig {
  interestRateModels: InterestRateConfig[];
  pools: PoolConfig[];
}

export interface InterestRateConfig {
  name: string;
  baseRatePerYear: string;
  multiplierPerYear: string;
  jumpMultiplierPerYear: string;
  kink: string;
}

export interface PoolConfig {
  name: string;
  closeFactor: string;
  liquidationIncentive: string;
  markets: CTokenConfig[];
}

export interface CTokenConfig {
  underlying: string;
  interestRateModel: string;
  collateralFactor: string;
  reserveFactor: string;
}

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

export interface DeprecateCTokenParams {
  cToken: string;
}

export interface VerifyContractParams {
  contractName: string;
  address: string;
}

export interface ContractCollection {
  [name: string]: ethers.Contract;
}

export interface InterestRateCollection extends ContractCollection {}
export interface CTokenCollection extends ContractCollection {}

export type Erc20ConstructorArgs = [
  initialAmount: ethers.BigNumber,
  tokenName: string,
  decimalUnits: number,
  tokenSymbol: string
];

export type ContractEntry = [string, ethers.Contract];

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
  cTokens: CTokenCollection
};
