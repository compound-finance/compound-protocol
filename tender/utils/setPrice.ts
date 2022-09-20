import hre from "hardhat";
import { BigNumberish, ethers } from "ethers";


const mockPriceOracleAddress = "0xc2E597bec496ed2c4b8D9fFaF9e01346ba20ceB5"

export async function mockUpdatePrice(cToken: string, price: BigNumberish) {
    const mockPriceOracle = await hre.ethers.getContractAt(
    "MockPriceOracle",
    mockPriceOracleAddress
  );
  
  
  console.log(`setting price of ${cToken} to ${price}` )
  let tx = await mockPriceOracle.mockUpdatePrice(cToken, price);
  console.log(tx.events)
}

export async function getUnderlyingPrice(cToken: string) {
  const mockPriceOracle = await hre.ethers.getContractAt(
  "MockPriceOracle",
  mockPriceOracleAddress
);


console.log(`getting price of ${cToken}` )
let tx = await mockPriceOracle.getUnderlyingPrice(cToken);
console.log(tx)
}