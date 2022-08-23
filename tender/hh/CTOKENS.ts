import { ethers } from "ethers";

const CTOKEN_DECIMALS = 8;

// These addresses need to be correct
export const CTOKENS = [
  // {
  //   //   underlying: "0xaD6D458402F60fD3Bd25163575031ACDce07538D",
  //   underlying: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
  //   name: "tWBTC",
  //   symbol: "tWBTC",
  //   decimals: CTOKEN_DECIMALS,
  //   collateralFactor: ethers.utils.parseUnits("8", 17),
  //   isGLP: false
  // },
  {
    underlying: "0x1aDDD80E6039594eE970E5872D247bf0414C8903",
    name: "fsGLP",
    symbol: "tfsGLP",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("95", 17),
    isGLP: true
  },

  // /not deployed
//   {
//     underlying: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
//     name: "tDAI",
//     symbol: "tDAIC",
//     decimals: CTOKEN_DECIMALS,
//     collateralFactor: ethers.utils.parseUnits("9", 17),
//     isGLP: false
//   },

// {
//     underlying: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
//     name: "tUSDC",
//     symbol: "tUSDC",
//     decimals: CTOKEN_DECIMALS,
//     collateralFactor: ethers.utils.parseUnits("9", 17),
//     isGLP: false
//   },
  {
    underlying: "0x420000000000000000000000000000000000000a",
    name: "tETH", // use wrapped ether,
    symbol: "tETH",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("7", 17),
    isGLP: false
  },

];