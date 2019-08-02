import BigNumber from 'bignumber.js';
import { utils, ethers } from 'ethers';

const smallEnoughNumber = new BigNumber('100000000');

export type encodedNumber = number | utils.BigNumber;

// Returns the mantissa of an Exp with given floating value
export function getExpMantissa(float: number): encodedNumber {
  // Workaround from https://github.com/ethereum/web3.js/issues/1920
  const str = Math.floor(float * 1.0e18).toString();

  return toEncodableNum(str);
}

export function toEncodableNum(amountArgRaw: string | encodedNumber): encodedNumber {
  let bigNumber;
  if (amountArgRaw instanceof BigNumber) {
    bigNumber = amountArgRaw;
  } else {
    bigNumber = new BigNumber(amountArgRaw.toString());
  }

  if (bigNumber.lt(smallEnoughNumber)) {
    // The Ethers abi encoder can handle regular numbers (including with fractional part)
    // and its own internal big number class which is different from BigNumber.js published on npm (and can't accept
    // fractional parts.)
    // If the input is not huge, we just use a number, otherwise we try to use the Ethers class.

    return Number(amountArgRaw);
  } else {
    // bigNumberify (and the result class) only accept integers as digits, so we do .toFixed() to convert, for example, 1e4 to 10000.
    // Rather than doing toFixed(0) and silently truncating a fractional part, we'll let it through and get an error.
    // that case
    return utils.bigNumberify(bigNumber.toFixed());
  }
}
