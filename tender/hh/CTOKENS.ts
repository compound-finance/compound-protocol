import { ethers } from "ethers";

const CTOKEN_DECIMALS = 8;

// These addresses need to be correct
export const CTOKENS = [
  // {
  //   //   underlying: "0xaD6D458402F60fD3Bd25163575031ACDce07538D",
  //   underlying: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
  //   name: "tWBTC",
  //   symbol: "tWBTC",
  //   decimals: CTOKEN_DECIMALS,
  //   collateralFactor: ethers.utils.parseUnits("8", 17),
  //   isGLP: false
  // },

// {
//     underlying: "0x1aDDD80E6039594eE970E5872D247bf0414C8903",
//     name: "fsGLP",
//     symbol: "tfsGLP",
//     decimals: CTOKEN_DECIMALS,
//     collateralFactor: ethers.utils.parseUnits("95", 16),
//     isGLP: true
  // },

//   {
//     underlying: "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
//     name: "FRAX",
//     symbol: "tFRAX",
//     decimals: CTOKEN_DECIMALS,
//     collateralFactor: ethers.utils.parseUnits("9", 17),
//     isGLP: false
//   },

//   {
//     underlying: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
//     name: "USDT",
//     symbol: "tUSDT",
//     decimals: CTOKEN_DECIMALS,
//     collateralFactor: ethers.utils.parseUnits("9", 17),
//     isGLP: false
//   },

  
{
    underlying: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    name: "tUSDC",
    symbol: "tUSDC",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("9", 17),
    collateralVIP: ethers.utils.parseUnits("9", 17),
    threshold: ethers.utils.parseUnits("9", 17),
    thresholdVIP: ethers.utils.parseUnits("9", 17),
    isGLP: false
  },


  // /not deployed
  // {
  //   underlying: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
  //   name: "tDAI",
  //   symbol: "tDAI",
  //   decimals: CTOKEN_DECIMALS,
  //   collateralFactor: ethers.utils.parseUnits("9", 17),
  //   isGLP: false
  // },

  // {
  //   underlying: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
  //   name: "tLINK",
  //   symbol: "tLINK",
  //   decimals: CTOKEN_DECIMALS,
  //   collateralFactor: ethers.utils.parseUnits("5", 17),
  //   isGLP: false
  // },

  // {
  //   underlying: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
  //   name: "tUNI",
  //   symbol: "tUNI",
  //   decimals: CTOKEN_DECIMALS,
  //   collateralFactor: ethers.utils.parseUnits("5", 17),
  //   isGLP: false
  // },

];