import { Wallet, Contract, BigNumber } from "ethers";
import { formatEther, formatUnits } from "ethers/lib/utils";
import * as ethers from "ethers";
import {
  JsonRpcSigner,
  JsonRpcProvider,
  ExternalProvider,
} from "@ethersproject/providers";
import { resolve } from "path";
import { parseAbiFromJson, getDeployments } from "./utils/TestUtil";
import { CTokenContract } from "./Token";
import { formatAmount } from "./utils/TokenUtil";

export class ComptrollerContract {
  public contract: Contract;

  constructor(signer: JsonRpcSigner) {
    const comptrollerAbiPath = resolve(
      __dirname,
      `../../artifacts/contracts/Comptroller.sol/Comptroller.json`
    );

    this.contract = new Contract(
      getDeployments().Unitroller,
      parseAbiFromJson(comptrollerAbiPath),
      signer
    );
  }

  setSigner = async (_signer: JsonRpcSigner) => {
    this.contract.connect(this.signer);
  };

  call = async (method: string, ...args: any[]) => {
    try {
      return await this.contract[method](...args);
    } catch (e) {
      throw e;
    }
  };

  exitMarket = async (ctoken: string) => {
    return await this.call("exitMarket", ctoken);
  };

  _setPriceOracle = async (oracleAddress: string) => {
    return await this.call("_setPriceOracle", oracleAddress);
  };

  getAssetsIn = async (account: string) => {
    return await this.call("getAssetsIn", account);
  };

  oracle = async () => {
    return await this.call("oracle");
  };

  accountAssets = async (address: string, index: bigNumber) => {
    return await this.call("accountAssets", address, index);
  };

  getAccountLiquidity = async (address: string) => {
    return await this.call("getAccountLiquidity", address);
  };

  getCurrentlyBorrowing = async (
    signer: JsonRpcSigner,
    cTokenContract: CTokenContract,
    underlyingDecimals: number
  ) => {
    const balance = await cTokenContract.borrowBalanceStored(signer._address);
    return formatAmount(balance, underlyingDecimals);
  };

  getCurrentlySupplying = async (
    signer: JsonRpcSigner,
    cTokenContract: CTokenContract,
    underlyingDecimals: number
  ) => {
    let balance = await cTokenContract.balanceOf(signer._address);
    let exchangeRateCurrent: BigNumber = await cTokenContract.exchangeRateStored();
    let tokens = balance.mul(exchangeRateCurrent);
    // the exchange rate is scaled by 18 decimals
    return formatAmount(tokens, underlyingDecimals + 18);
  };
}

// getAccountBorrowLimitInUsd =  async function getAccountBorrowLimitInUsd(
// signer: Signer,
// comptrollerAddress: string,
// tokenPairs: TokenPair[]
//   signer: Signer,
//   comptrollerAddress: string,
//   tokenPairs: TokenPair[]
//   tokenBalancesInUsd = await Promise.all(
//     tokenPairs.map(async (tokenPair: TokenPair): Promise<number> => {
//       return borrowLimitForTokenInUsd(signer, comptrollerContract, tokenPair);
//     })
//   );
//
//   let borrowLimit = tokenBalancesInUsd.reduce((acc, curr) => acc + curr, 0);
//
//   return borrowLimit;
// }
