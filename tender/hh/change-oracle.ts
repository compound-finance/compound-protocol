import hre from "hardhat";
import { readFileSync, writeFileSync } from "fs";

const outputFilePath = `./deployments/${hre.network.name}.json`;

export async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

    const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));

    let confirmations = hre.network.name === "metis" ? 3 : 1;

    const unitrollerProxy = await hre.ethers.getContractAt(
        "Comptroller",
        deployments.Unitroller
    );


    console.log(
        "calling unitrollerProxy._setPriceOracle() with address",
        deployments.PriceOracle
    );
    var tx = await unitrollerProxy._setPriceOracle(deployments.PriceOracle);
    await tx.wait(confirmations);

    // save data
    writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
