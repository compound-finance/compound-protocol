import { Wallet, Contract, BigNumber } from 'ethers';
import { formatEther, formatUnits } from 'ethers/lib/utils'
import * as ethers from 'ethers';
import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { resolve } from 'path';
import { parseAbiFromJson, getDeployments } from './TestUtil'
import { CTokenContract } from './Token'
import { formatAmount } from './TokenUtil'

export class ComptrollerContract {
  constructor(signer: JsonRpcSigner) {
    const comptrollerAbiPath = resolve(
      __dirname,
      `../../artifacts/contracts/Comptroller.sol/Comptroller.json`
    )
    let comptroller: Contract;
    comptroller = new Contract(
      getDeployments().Unitroller,
      parseAbiFromJson(comptrollerAbiPath),
      signer
    );
  }

  getCurrentlyBorrowing = async (signer: JsonRpcSigner, cTokenContract: CTokenContract, underlyingDecimals: number) => {
    const balance = await cTokenContract.borrowBalanceStored(signer._address);
    return formatAmount(balance, underlyingDecimals);
  }

  getCurrentlySupplying = async (signer: JsonRpcSigner, cTokenContract: CTokenContract, underlyingDecimals: number) => {
    let balance = await cTokenContract.balanceOf(signer._address);
    let exchangeRateCurrent: BigNumber = await cTokenContract.exchangeRateStored();
    let tokens = balance.mul(exchangeRateCurrent);
    // the exchange rate is scaled by 18 decimals
    return formatAmount(tokens, underlyingDecimals+18);
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
