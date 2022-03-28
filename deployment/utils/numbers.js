

function numberToMantissa(number) {
  // eslint-disable-next-line prefer-const
  let [integrerPart, decimalPart] = number.toString().split('.');

  if (!decimalPart) {
    decimalPart = '';
  }

  return BigInt(integrerPart + decimalPart.slice(0, 18).padEnd(18, '0'));
}

function oneWithDecimals(decimals) {
  return 10n ** BigInt(decimals);
}

module.exports = {
  numberToMantissa,
  oneWithDecimals,
};