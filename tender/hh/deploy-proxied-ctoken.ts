import hre from "hardhat";
import { numToWei } from "../utils/ethUnitParser";

import { readFileSync, writeFileSync } from "fs";
// import { ethers } from "ethers";
import { ethers, upgrades } from "hardhat";

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
// usdt fracx
const TEST_NET_CTOKENS = [
  {
    underlying: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
    name: "tWBTC",
    symbol: "tWBTC",
    decimals: CTOKEN_DECIMALS,
    collateralFactor: ethers.utils.parseUnits("8", 17),
    priceInUsd: "1",
    isGLP: false
  },
//   {
//     underlying: "0x1aDDD80E6039594eE970E5872D247bf0414C8903",
//     name: "fsGLP",
//     symbol: "fsGLP",
//     decimals: CTOKEN_DECIMALS,
//     collateralFactor: ethers.utils.parseUnits("9", 17),
//     priceInUsd: "1",
//     isGLP: true
//   },

//   {
//     underlying: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
//     name: "tDAI",
//     symbol: "tDAIC",
//     decimals: CTOKEN_DECIMALS,
//     collateralFactor: ethers.utils.parseUnits("9", 17),
//     priceInUsd: "1",
//   },
//   {
//     underlying: "0x420000000000000000000000000000000000000a",
//     name: "tETH", // use wrapped ether,
//     symbol: "TEther",
//     decimals: CTOKEN_DECIMALS,
//     collateralFactor: ethers.utils.parseUnits("7", 17),
//     priceInUsd: "1800",
//     isGLP: false
//   },

];

export const CTOKENS = TEST_NET_CTOKENS

export async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const CErc20Immutable = await hre.ethers.getContractFactory(
    "CErc20Delegator"
  );

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  // const comptrollerAddress: string = deployments.Comptroller;
  const unitrollerAddress: string = deployments.Unitroller;
  // TODO: This is fragile if the parameters change
  const irModelAddress: string =
    deployments.IRModels.JumpRateModelV2["0__80__50__1000"];

  for (let i = 0; i < CTOKENS.length; i++) {
    let token = CTOKENS[i];

    const erc20Underlying = await hre.ethers.getContractAt(
      "EIP20Interface",
      token.underlying
    );
    const underlyingDecimals = await erc20Underlying.decimals();
    const totalDecimals = underlyingDecimals + token.decimals;
    const initialExcRateMantissaStr = numToWei("2", totalDecimals);

    const cErc20Immutable = await upgrades.deployProxy(CErc20Immutable, [
      token.underlying,
      unitrollerAddress,
      irModelAddress,
      initialExcRateMantissaStr,
      token.name,
      token.symbol,
      token.decimals,
      token.isGLP === true,
    ],
    {
        initializer: "tinit",
        // useDeployedImplementation: true,
        kind: 'transparent',
    });
    await cErc20Immutable.deployed();
    console.log("CErc20Immutable deployed to:", cErc20Immutable.address);

    if (token.isGLP) {
      console.log("calling ctoken._setStakedGlpAddress()");
      await cErc20Immutable._setStakedGlpAddress("0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE")
      console.log("calling ctoken._setRewardRouterAddress()");
      await cErc20Immutable._setRewardRouterAddress("0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1")
    }

    const unitrollerProxy = await hre.ethers.getContractAt(
      "Comptroller",
      unitrollerAddress
    );

    console.log("calling unitrollerProxy._supportMarket()");

    await unitrollerProxy._supportMarket(cErc20Immutable.address, true, false); // 

    let confirmations = hre.network.name === "metis" ? 5 : 1;
    await cErc20Immutable.deployTransaction.wait(confirmations);

    // Save to output
    deployments[token.symbol] = cErc20Immutable.address;
    writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));

    // try {
    //   await verifyContract(cErc20Immutable.address, [
    //     token.underlying,
    //     unitrollerAddress,
    //     irModelAddress,
    //     initialExcRateMantissaStr,
    //     token.name,
    //     token.symbol,
    //     token.decimals,
    //     token.isGLP === true,
    //     deployer.address,
    //   ]);
    // } catch (e) {
    //   console.error("Error verifying cErc20Immutable", cErc20Immutable.address);
    //   console.error(e);
    // }
  }
}

// const verifyContract = async (
//   contractAddress: string,
//   constructorArgs: any
// ) => {
//   await hre.run("verify:verify", {
//     contract: "contracts/CErc20Immutable.sol:CErc20Immutable",
//     address: contractAddress,
//     constructorArguments: constructorArgs,
//   });
// };

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
