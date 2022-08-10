import hre from "hardhat";
import { readFileSync } from "fs";

const outputFilePath = `./deployments/${hre.network.name}.json`;

const OracleAbi = [
  `function _setUnderlyingForCTokens(address[] memory, address[] memory) external`,
  `function underlyings(address) external view returns(address)`,
];

export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  const unitrollerProxy = await hre.ethers.getContractAt(
    "Comptroller",
    deployments.Unitroller
  );
  const oracleAddr = await unitrollerProxy.oracle();

  console.log(oracleAddr, "orracl");

  const allMarkets = await unitrollerProxy.getAllMarkets();

  console.log("all markets", allMarkets);

  const oracle = new hre.ethers.Contract(
    oracleAddr,
    OracleAbi,
    hre.ethers.provider.getSigner()
  );
  const cTokens = [];
  const underlyings = [];

  for (let i = 0; i < allMarkets.length; i++) {
    const cTokenAddr = allMarkets[i];
    const oracleUnderlying = await oracle.underlyings(cTokenAddr);
    if (oracleUnderlying === hre.ethers.constants.AddressZero) {
      cTokens.push(allMarkets[i]);

      const CErc20I = await hre.ethers.getContractAt(
        "CErc20Interface",
        cTokenAddr
      );
      const cTokenUnderlying = await CErc20I.underlying();
      underlyings.push(cTokenUnderlying);
    }
  }

  if (cTokens.length !== underlyings.length)
    throw Error("configs length mismatch");
  if (cTokens.length === 0) {
    console.log("No configs found to be added");
    return;
  }

  const tx = await oracle._setUnderlyingForCTokens(cTokens, underlyings);
  console.log(`CToken Configs set in txn: ${tx.hash}`);
  await tx.wait();
}

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
