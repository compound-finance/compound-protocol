import { ethers } from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import deployContract from "./deployContract";
import { getUnderlyingTokens, recordCTokenAddress } from "./deployAddresses";
import { getChainId } from "./utils";
import { TransactionResponse } from "ethers/providers";
import { AddressConfig, CErc20ImmutableConstructorArgs } from "./types";

export async function deployCToken(
  deployer: Deployer,
  underlyingAddr: string,
  comptrollerAddress: string,
  interestRateModel: string,
  exchangeRateDecimals: number = 28
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

  const initialExchangeRateMantissa: ethers.BigNumber = ethers.utils.parseUnits(
    "1",
    exchangeRateDecimals
  );
  const decimals: number = 8;
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
  interestRateModel: ethers.Contract
): Promise<ethers.Contract[]> {
  const chainId: number = getChainId(deployer.hre);

  const underlyingTokens: AddressConfig = getUnderlyingTokens();

  const tokensOnChain: string[] = Object.keys(underlyingTokens).filter(
    (key: string): boolean => underlyingTokens[key][chainId] !== undefined
  );

  const cTokens: ethers.Contract[] = await Promise.all(
    tokensOnChain.map(
      async (key: string): Promise<ethers.Contract> => {
        const cToken: ethers.Contract = await deployCToken(
          deployer,
          underlyingTokens[key][chainId],
          comptroller.address,
          interestRateModel.address
        );

        recordCTokenAddress(chainId, key, cToken.address);

        return cToken;
      }
    )
  );

  return cTokens;
}

export async function addCTokenToMarket(
  comptroller: ethers.Contract,
  ctokenAddress: string
) {
  const addMarketTx: TransactionResponse = await comptroller._supportMarket(ctokenAddress);
  await addMarketTx.wait();

  // If the ctoken isn't a supported market, it will fail to set the collateral factor
  const collateralFactor: ethers.BigNumber = ethers.utils.parseEther("0.5");
  const collateralTx: TransactionResponse = await comptroller._setCollateralFactor(
    ctokenAddress,
    collateralFactor
  );
  await collateralTx.wait();
}
