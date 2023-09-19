import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import {
  getMainAddresses,
  getUnderlyingTokens,
  recordCTokenAddress
} from "../script/deployAddresses";
import { deployCToken } from "../script/deployCToken";

async function main(
  hre: HardhatRuntimeEnvironment,
  underlying: string,
  exchangeRateDecimals: number
) {
  const wallet = await hre.getWallet();

  const deployer = new Deployer(hre, wallet);

  const addresses = getMainAddresses();
  const chainId = hre.network.config.chainId;

  const comptrollerAddress = addresses["comptroller"][chainId];
  const interestRateModel = addresses["interest"][chainId];

  const underlyingTokens = getUnderlyingTokens();
  const underlyingAddr = underlyingTokens[underlying][chainId];

  const cToken = await deployCToken(
    deployer,
    underlyingAddr,
    comptrollerAddress,
    interestRateModel,
    exchangeRateDecimals
  );

  recordCTokenAddress(chainId, underlying, cToken.address);
}

task("deployCToken", "Deploy a new CToken")
  .addPositionalParam("underlying", "Token name from tokens.json, e.g. wbtc")
  .addPositionalParam(
    "exchangeRateDecimals",
    "Price decimals (18) - CToken decimals (8) + underlying decimals"
  )
  .setAction(async ({ underlying, exchangeRateDecimals }, hre) => {
    console.log("Deploying a new ZToken...");

    await main(hre, underlying, exchangeRateDecimals);
  });
