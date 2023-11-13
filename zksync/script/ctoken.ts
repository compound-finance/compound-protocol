import { ethers } from "ethers";
import deployContract from "./contract";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { TransactionResponse } from "ethers/providers";
import {
  CErc20ImmutableConstructorArgs,
  CTokenCollection,
  CTokenConfig,
  InterestRateCollection
} from "./types";

export async function deployCToken(
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

export async function deployCTokenAll(
  deployer: Deployer,
  comptroller: ethers.Contract,
  interestRates: InterestRateCollection,
  cTokenConfigs: CTokenConfig[]
): Promise<CTokenCollection> {
  const cTokens: CTokenCollection = {};

  // Must complete txs sequentially for correct nonce
  for (const config of cTokenConfigs) {
    const { underlying, interestRateModel } = config;
    const underlyingAddress: string = deployer.hre.getUnderlyingToken(underlying);

    const cToken: ethers.Contract = await deployCToken(
      deployer,
      underlyingAddress,
      comptroller.address,
      interestRates[interestRateModel].address
    );

    deployer.hre.recordCTokenAddress(underlying, cToken.address);

    cTokens[underlying] = cToken;
  }

  return cTokens;
}

export async function addCTokenToMarket(
  comptroller: ethers.Contract,
  cToken: ethers.Contract,
  config: CTokenConfig
): Promise<void> {
  console.log(`Adding ${cToken.address} to comptroller`);

  const addMarketTx: TransactionResponse = await comptroller._supportMarket(cToken.address);
  await addMarketTx.wait();

  const collateralFactor: ethers.BigNumber = ethers.utils.parseEther(config.collateralFactor);

  // If the ctoken isn't a supported market, it will fail to set the collateral factor
  // If the ctoken does not have an oracle price, it will fail to set the collateral factor
  const collateralTx: TransactionResponse = await comptroller._setCollateralFactor(
    cToken.address,
    collateralFactor
  );
  await collateralTx.wait();

  const reserveFactor: ethers.BigNumber = ethers.utils.parseEther(config.reserveFactor);
  const reserveTx: TransactionResponse = await cToken._setReserveFactor(reserveFactor);
  await reserveTx.wait();
}

export async function deprecateCToken(
  comptroller: ethers.Contract,
  cToken: ethers.Contract
): Promise<void> {
  const collateralFactor: ethers.BigNumber = ethers.BigNumber.from("0");
  const collateralTx: TransactionResponse = await comptroller._setCollateralFactor(cToken.address, collateralFactor);
  await collateralTx.wait();

  const borrowPauseTx: TransactionResponse = await comptroller._setBorrowPaused(cToken.address, true);
  await borrowPauseTx.wait();

  const reserveFactor: ethers.BigNumber = ethers.utils.parseEther("1");
  const reserveTx: TransactionResponse = await cToken._setReserveFactor(reserveFactor);
  await reserveTx.wait();
}
