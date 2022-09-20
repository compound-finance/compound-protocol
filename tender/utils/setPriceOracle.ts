import hre from "hardhat";

const unitrollerAddress = "0x068134C0916583787320BDAF4381509E83990499"
const priceOracleAddress = "0xc2E597bec496ed2c4b8D9fFaF9e01346ba20ceB5"

async function main() {
    const unitrollerProxy = await hre.ethers.getContractAt(
    "Comptroller",
    unitrollerAddress
  );

  console.log("setting price oracle", priceOracleAddress, "on", unitrollerAddress)
  let tx = await unitrollerProxy._setPriceOracle(priceOracleAddress);
  console.log(tx.events)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });