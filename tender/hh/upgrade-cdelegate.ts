import hre from "hardhat";

const contracts = {
  // "tfsGLP": "0x118C6fE960Ed8Bb50D722a0323BD676f2D1c3F40",

  "tWBTC": "0xde131f422585927c5d19879ee22241678273b155",
  // "tUSDC": "0x0ECDd9d55F03a3D626fA5734C7eecdcB3fADB737",
  // "tUSDT": "0xAd2fB9A27Fd46865BBa1d2954BD0700e7428Dfb7"
}

const allowResign = true
const data = Buffer.from([0x0])
const implementation = "0xBe3b1d013563C61c47eD511c36AE20A220B49229"


export async function main() {

  

  for (let key in contracts) {
    await setAddress(key, contracts[key], implementation);
  }
}



async function setAddress(symbol: string, address: string, implementation: string) {
  const delegator = await hre.ethers.getContractAt("CErc20Delegator", address);

  console.log("setting implementation on", symbol, address, "to", implementation)
  
  await delegator._setImplementation(implementation, allowResign, data)

  console.log("Set implementation")

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
