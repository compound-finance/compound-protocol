import hre from "hardhat";

const unitrollerAddress = "0xbEbeF25702c845aAdee25DCf9a63D248C8fe5DAC"
const priceOracleAddress = "0xD550A36DC56046afa908c52579f130e724D83eae"

export async function _setPriceOracle(unitrollerAddress: string, priceOracleAddress: string) {
    const unitrollerProxy = await hre.ethers.getContractAt(
    "Comptroller",
    unitrollerAddress
  );

  console.log("setting price oracle", priceOracleAddress, "on", unitrollerAddress)
  let tx = await unitrollerProxy._setPriceOracle(priceOracleAddress);
  console.log(tx.events)
}


async function main() {
  await _setPriceOracle(unitrollerAddress, priceOracleAddress)
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });