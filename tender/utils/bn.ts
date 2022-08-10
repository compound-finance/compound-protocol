import { BigNumber } from "bignumber.js";
import { ethers } from "ethers";
BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_DOWN });

export const toBn = (num: BigNumber.Value | ethers.BigNumber): BigNumber => {
  return new BigNumber(num.toString());
};

export const toBnFixed = (num: BigNumber.Value | ethers.BigNumber): string => {
  return toBn(num).toFixed();
};
