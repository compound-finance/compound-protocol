import hre from "hardhat";

export async function main() {
  const address = "0x03FCED65cdde966555dB96bF2A5E9A97564dBe05"
  const implementation = "0x54541071E5A5760D7E60dDF3c43872C723a4a11f"
  const allowResign = true
  const data = Buffer.from([0x0])


  const delegator = await hre.ethers.getContractAt(
    "CErc20Delegator",
    address
  );

  console.log("setting implementation on", address, "to", implementation)

  await delegator._setImplementation(implementation, allowResign, data)

  console.log("Set implementation")

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
