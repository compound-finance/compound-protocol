import { ethers } from "ethers";

const CTOKEN_DECIMALS = 8;


// These addresses need to be correct
export const CTOKENS = [
  {
    underlying: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    name: "USDT",
    symbol: "tUSDT",
    decimals: CTOKEN_DECIMALS,
    isGLP: false,
    collateralFactor: ethers.utils.parseUnits("75", 16),
    collateralVIP: ethers.utils.parseUnits("85", 16),
    threshold: ethers.utils.parseUnits("80", 16),
    thresholdVIP: ethers.utils.parseUnits("90", 16),
  },
  {
    underlying: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    name: "tUSDC",
    symbol: "tUSDC",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("80", 16),
    collateralVIP: ethers.utils.parseUnits("85", 16),
    threshold: ethers.utils.parseUnits("85", 16),
    thresholdVIP: ethers.utils.parseUnits("90", 16),
    isGLP: false
  },
];

export const CTokens = {
  tWBTC: {
    underlying: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    name: "tWBTC",
    symbol: "tWBTC",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("70", 16),
    collateralVIP: ethers.utils.parseUnits("85", 16),
    threshold: ethers.utils.parseUnits("75", 16),
    thresholdVIP: ethers.utils.parseUnits("90", 16),
    isGLP: false
  },
  tfsGLP: {
    underlying: "0x1aDDD80E6039594eE970E5872D247bf0414C8903",
    name: "fsGLP",
    symbol: "tfsGLP",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("5", 17),
    collateralVIP: ethers.utils.parseUnits("95", 16),
    threshold: ethers.utils.parseUnits("5", 17),
    thresholdVIP: ethers.utils.parseUnits("95", 16),
    isGLP: true
  },
  tFRAX: {
    underlying: "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
    name: "FRAX",
    symbol: "tFRAX",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("9", 17),
    isGLP: false
  },
  tUSDT: {
    underlying: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    name: "USDT",
    symbol: "tUSDT",
    decimals: CTOKEN_DECIMALS,
    isGLP: false,
    collateralFactor: ethers.utils.parseUnits("75", 16),
    collateralVIP: ethers.utils.parseUnits("85", 16),
    threshold: ethers.utils.parseUnits("80", 16),
    thresholdVIP: ethers.utils.parseUnits("90", 16),
  },
  tUSDC: {
    underlying: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    name: "tUSDC",
    symbol: "tUSDC",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("80", 16),
    collateralVIP: ethers.utils.parseUnits("85", 16),
    threshold: ethers.utils.parseUnits("85", 16),
    thresholdVIP: ethers.utils.parseUnits("90", 16),
    isGLP: false
  },
};

export const GMX = {
  underlying: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
  name: "GMX",
  symbol: "tGMX",
  decimals: 8,
  collateralFactor: ethers.utils.parseUnits("5", 17),
  collateralVIP: ethers.utils.parseUnits("80", 16),
  threshold: ethers.utils.parseUnits("5", 17),
  thresholdVIP: ethers.utils.parseUnits("80", 16),
  isGLP: false,
}

