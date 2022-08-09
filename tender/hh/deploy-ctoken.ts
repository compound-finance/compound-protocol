import hre from "hardhat";
import { numToWei } from "../utils/ethUnitParser";

import { readFileSync, writeFileSync } from "fs";
import { ethers } from "ethers";

const outputFilePath = `./deployments/${hre.network.name}.json`;

const CTOKEN_DECIMALS = 8;

const MAIN_NET_CTOKENS = [
  {
    underlying: "0xEA32A96608495e54156Ae48931A7c20f0dcc1a21",
    name: "tUSDC Token",
    symbol: "tUSDC",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("8", 17),
    priceInUsd: "1",
  },
  {
    underlying: "0x420000000000000000000000000000000000000a",
    name: "tETH Token",
    symbol: "tETH",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("7", 17),
    priceInUsd: "1800",
  },
  {
    underlying: "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
    name: "tMetis Token",
    symbol: "tMETIS",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("5", 17),
    priceInUsd: "20",
  },

  {
    underlying: "0xa5B55ab1dAF0F8e1EFc0eB1931a957fd89B918f4",
    name: "tWBTC Token",
    symbol: "tWBTC",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("7", 17),
    priceInUsd: "1",
  },
  {
    underlying: "0x4651B38e7ec14BB3db731369BFE5B08F2466Bd0A",
    name: "tDAI Token",
    symbol: "tDAI",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("8", 17),
    priceInUsd: "1",
  },
  {
    underlying: "0xbB06DCA3AE6887fAbF931640f67cab3e3a16F4dC",
    name: "tUSDT Token",
    symbol: "tUSDT",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("8", 17),
    priceInUsd: "1",
  },


];


// These addresses need to be correct

const TEST_NET_CTOKENS = [
  {
    underlying: "0xaD6D458402F60fD3Bd25163575031ACDce07538D",
    name: "tDAI",
    symbol: "tDAIC",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("9", 17),
    priceInUsd: "1",
  },
  // {
  //   underlying: "0x420000000000000000000000000000000000000a",
  //   name: "tETH",
  //   symbol: "tTestETH",
  //   decimals: CTOKEN_DECIMALS,
  //   collateralFactor: ethers.utils.parseUnits("7", 17),
  //   priceInUsd: "1800",
  // },

];

export const CTOKENS = TEST_NET_CTOKENS

export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const CErc20Immutable = await hre.ethers.getContractFactory(
    "CErc20Immutable"
  );

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  // const comptrollerAddress: string = deployments.Comptroller;
  const unitrollerAddress: string = deployments.Unitroller;
  // TODO: This is fragile if the parameters change
  const irModelAddress: string =
    deployments.IRModels.WhitePaperInterestRateModel["2102400"]["0__1500"];

  for (let i = 0; i < CTOKENS.length; i++) {
    let token = CTOKENS[i];

    const erc20Underlying = await hre.ethers.getContractAt(
      "EIP20Interface",
      token.underlying
    );
    const underlyingDecimals = await erc20Underlying.decimals();
    const totalDecimals = underlyingDecimals + token.decimals;
    const initialExcRateMantissaStr = numToWei("2", totalDecimals);

    const cErc20Immutable = await CErc20Immutable.deploy(
      token.underlying,
      unitrollerAddress,
      irModelAddress,
      initialExcRateMantissaStr,
      token.name,
      token.symbol,
      token.decimals,
      deployer.address
    );
    await cErc20Immutable.deployed();
    console.log("CErc20Immutable deployed to:", cErc20Immutable.address);

    const unitrollerProxy = await hre.ethers.getContractAt(
      "Comptroller",
      unitrollerAddress
    );

    console.log("calling unitrollerProxy._supportMarket()");

    await unitrollerProxy._supportMarket(cErc20Immutable.address);

    let confirmations = hre.network.name === "metis" ? 5 : 1;
    await cErc20Immutable.deployTransaction.wait(confirmations);

    // Save to output
    deployments[token.symbol] = cErc20Immutable.address;
    writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

    try {
      await verifyContract(cErc20Immutable.address, [
        token.underlying,
        unitrollerAddress,
        irModelAddress,
        initialExcRateMantissaStr,
        token.name,
        token.symbol,
        token.decimals,
        deployer.address,
      ]);
    } catch (e) {
      console.error("Error verifying cErc20Immutable", cErc20Immutable.address);
      console.error(e);
    }
  }
}

const verifyContract = async (
  contractAddress: string,
  constructorArgs: any
) => {
  await hre.run("verify:verify", {
    contract: "contracts/CErc20Immutable.sol:CErc20Immutable",
    address: contractAddress,
    constructorArguments: constructorArgs,
  });
};

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
