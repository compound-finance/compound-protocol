import hre from "hardhat";

export async function main() {
  const address = "0x118C6fE960Ed8Bb50D722a0323BD676f2D1c3F40"
  const implementation = "0xDF24d795e19f112e39566b73F700939d3346A339"
  const allowResign = true
  const data = Buffer.from([0x0])


  const delegator = await hre.ethers.getContractAt("CErc20Delegator", address);

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
