import { BigNumber } from "bignumber.js";
import { ethers } from "ethers";
import { toBn } from "./bn";

export const weiToNum = (
  amount: BigNumber.Value | ethers.BigNumber,
  decimals: BigNumber.Value | ethers.BigNumber,
): string => {
  return toBn(amount)
    .div(toBn(10).pow(toBn(decimals)))
    .toFixed();
};

export const numToWei = (
  amount: BigNumber.Value | ethers.BigNumber,
  decimals: BigNumber.Value | ethers.BigNumber,
): string => {
  return toBn(amount)
    .times(toBn(10).pow(toBn(decimals)))
    .toFixed(0, 1); // rounding mode: Round_down
};
