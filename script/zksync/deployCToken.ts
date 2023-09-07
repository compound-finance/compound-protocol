import * as ethers from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import deployContract from "./deployContract";
import {
  getUnderlyingTokens,
  recordCTokenAddress
} from "./deployAddresses";
import {
  configurePriceOracle,
  addCTokenToMarket
} from "./deployCore";

export async function deployCToken(
  deployer: Deployer,
  underlyingAddr:string,
  comptrollerAddress:string,
  interestRateModel:string,
  exchangeRateDecimals: number = 28
) {
  const underlying = await deployer.hre.ethers.getContractAt(
    "EIP20Interface",
    underlyingAddr,
    deployer.zkWallet
  );

  const underlyingName = await underlying.name();
  const name:string = `Zoro ${underlyingName}`;

  const underlyingSymbol = await underlying.symbol();
  const symbol:string = `z${underlyingSymbol}`;

  const initialExchangeRateMantissa:number = ethers.utils.parseUnits("1", exchangeRateDecimals);
  const decimals:number = 8;
  const admin = deployer.zkWallet.address;

  const cTokenArgs = [
      underlyingAddr,
      comptrollerAddress,
      interestRateModel,
      initialExchangeRateMantissa,
      name,
      symbol,
      decimals,
      admin,
  ];

  const cToken = await deployContract(deployer, "CErc20Immutable", cTokenArgs);

  return cToken;
}

export async function deployCTokenAll(
  deployer: Deployer,
  priceOracle: ethers.Contract,
  comptroller: ethers.Contract,
  interestRateModel: ethers.Contract
) {
  const chainId = deployer.hre.network.config.chainId;

  const underlyingTokens = getUnderlyingTokens();

  const tokensOnChain = Object.keys(underlyingTokens).filter(
      (key) => underlyingTokens[key][chainId] !== undefined
  );

  const cTokens = await Promise.all(tokensOnChain.map(async (key) => {
    const cToken = await deployCToken(
      deployer,
      underlyingTokens[key][chainId],
      comptroller.address,
      interestRateModel.address
    );

    recordCTokenAddress(chainId, key, cToken.address);

    return cToken;
  }));

  // If price is zero, the comptroller will fail to set the collateral factor
  await Promise.all(cTokens.map(async (cToken) => {
    await configurePriceOracle(priceOracle, cToken.address);
    await addCTokenToMarket(comptroller, cToken.address);
  }));
}
