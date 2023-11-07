import * as ethers from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import deployContract from "./deployContract";
import { getUnderlyingTokens, recordCTokenAddress } from "./deployAddresses";
import { configurePriceOracle, addCTokenToMarket } from "./deployCore";
import { getChainId } from "./utils";
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
  priceOracle: ethers.Contract,
  comptroller: ethers.Contract,
  interestRateModel: ethers.Contract
): Promise<void> {
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

  // If price is zero, the comptroller will fail to set the collateral factor
  await Promise.all(
    cTokens.map(
      async (cToken: ethers.Contract): Promise<void> => {
        await configurePriceOracle(priceOracle, cToken.address);
        await addCTokenToMarket(comptroller, cToken.address);
      }
    )
  );
}
