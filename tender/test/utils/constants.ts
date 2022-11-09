import { ethers } from "ethers"

export const CTOKEN_DECIMALS = 8

export const IERC20 = 'contracts/IERC20.sol:IERC20';
export const CERC20 = 'contracts/CErc20.sol:CErc20';

export const WHALES = {
  USDT: "0x750f6Ed08f00f5e1c519e650d82d6Ff101E60841",
  USDC: "0x39ef179bB1953f916003F5Dc9a321ce978df3118",
}

export const CTOKENS = {
  tWBTC: {
    underlying: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    underlyingSymbol: "WBTC",
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
    underlyingSymbol: "fsGLP",
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
    underlyingSymbol: "FRAX",
    name: "FRAX",
    symbol: "tFRAX",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("9", 17),
    isGLP: false
  },
  tUSDT: {
    underlying: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    underlyingSymbol: "USDT",
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
    underlyingSymbol: "USDC",
    name: "tUSDC",
    symbol: "tUSDC",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("80", 16),
    collateralVIP: ethers.utils.parseUnits("85", 16),
    threshold: ethers.utils.parseUnits("85", 16),
    thresholdVIP: ethers.utils.parseUnits("90", 16),
    isGLP: false
  },
}
