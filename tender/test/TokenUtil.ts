import { Wallet, Contract, BigNumber } from 'ethers';
import { formatEther, formatUnits } from 'ethers/lib/utils'
import * as ethers from 'ethers';
import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { resolve } from 'path';
import { parseAbiFromJson, getDeployments } from './TestUtil'
import axios from 'axios';

export const formatAmount = (amount: string, decimals: number) => {
  const regex = /^0*\.0*/;
  let match = amount.match(regex)
  amount = match ? amount.replace(match[0], '') : amount;

  const leadingZeros = match ? match[0].split('.')[1].length + 1 : 0;
  decimals = decimals - leadingZeros;

  const scaleFactor = BigNumber.from('10').pow(decimals);
  return BigNumber.from(amount).mul(scaleFactor);
}

export const getCollateralFactor = async (comptrollerContract: Contract, tTokenAddress: string) => {
  await comptrollerContract.enterMarkets([tTokenAddress]);
  const { 1: rawCollateralFactor } = await comptrollerContract.markets(tTokenAddress);
  return formatAmount(rawCollateralFactor, 18)
}

export const getComptrollerContract = (wallet: JsonRpcSigner) =>{
  const comptrollerAddress = getDeployments()['Unitroller'];
  const abiPath = resolve(__dirname, `../../artifacts/contracts/Comptroller.sol/Comptroller.json`);
  const comptrollerAbi = parseAbiFromJson(abiPath);
  return new Contract(comptrollerAddress, comptrollerAbi, wallet)
}

export const getCurrentlySupplying = async (tTokenContract: Contract, wallet: JsonRpcSigner) => {
  let balance = await tTokenContract.callStatic.balanceOf(wallet._address)
  let exchangeRateCurrent: BigNumber = await tTokenContract.exchangeRateStored();
  let tokens = balance.mul(exchangeRateCurrent)
  // the exchange rate is scaled by 18 decimals
  const tokenDecimals = await tTokenContract.decimals() + 18;
  return formatAmount(tokens, tokenDecimals);
};

export const getUnderlyingBalance = async (
  uBalanceProvider: any,
  address: string
) => {
  if (uBalanceProvider['getBalance']) {
    return await uBalanceProvider.getBalance(address);
  } else {
    return await uBalanceProvider.balanceOf(address);
  }
}
