import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import { numToWei } from "../../utils/ethUnitParser";

import { readFileSync, writeFileSync } from "fs";
import { CTOKENS } from "./CTOKENS";
import { resolve } from "path";

const copyPath = resolve(__dirname, `../../../deployments/gmx.json`);
const outputFilePath = resolve(
  __dirname,
  `../../../deployments/${hre.network.name}.json`
);

const stakedGLPAddress = "0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE";
const glpRewardRouterAddress = "0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1";
const glpManagerAddress = "0x321f653eed006ad1c29d174e17d96351bde22649";

export async function deploy(deploymentFp) {
  const copyPath = deploymentFp
    ? resolve(__dirname, `../../../deployments/${deploymentFp}.json`)
    : resolve(__dirname, `../../../deployments/gmx.json`);

  const outputFilePath = resolve(
    __dirname,
    `../../../deployments/${hre.network.name}.json`
  );
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));
  const unitrollerAddress: string = deployments.Unitroller;
  const irModelAddress: string = deployments.IRModels.JumpRateModelV2;

  const unitrollerProxy = await hre.ethers.getContractAt(
    "Comptroller",
    unitrollerAddress
  );

  const adminAddress = await unitrollerProxy.admin();
  const admin = await ethers.getImpersonatedSigner(adminAddress);

  const delegatorFactory = await hre.ethers.getContractFactory(
    "CErc20Delegator"
  );
  const CErc20Delegate = await hre.ethers.getContractFactory("CErc20Delegate");

  for (let i = 0; i < CTOKENS.length; i++) {
    let token = CTOKENS[i];

    const erc20Underlying = await hre.ethers.getContractAt(
      "EIP20Interface",
      token.underlying
    );
    const underlyingDecimals = await erc20Underlying.decimals();
    const totalDecimals = underlyingDecimals + token.decimals;
    const initialExcRateMantissaStr = numToWei("2", totalDecimals);

    const deployedCErc20Delegate = await CErc20Delegate.deploy();
    const delegateAddress = deployedCErc20Delegate.address;

    const delegator = await delegatorFactory.deploy(
      token.underlying,
      unitrollerAddress,
      irModelAddress,
      initialExcRateMantissaStr,
      token.name,
      token.symbol,
      token.decimals,
      token.isGLP === true,
      adminAddress,
      delegateAddress,
      Buffer.from([0x0])
    );

    await delegator.deployed();

    if (token.isGLP) {
      await delegator._setGlpAddresses(
        stakedGLPAddress,
        glpRewardRouterAddress,
        glpManagerAddress
      );
    }

    let isPrivate = token.isGLP === true;
    let isComped = true;
    let onlyWhitelistedBorrow = false;
    await unitrollerProxy
      .connect(admin)
      ._supportMarket(
        delegator.address,
        isComped,
        isPrivate,
        onlyWhitelistedBorrow
      );

    await unitrollerProxy
      .connect(admin)
      ._setFactorsAndThresholds(
        delegator.address,
        token.collateralFactor,
        token.collateralVIP,
        token.threshold,
        token.thresholdVIP
      );

    // Save to output
    deployments[`${token.symbol}_delegate`] = delegateAddress;
    deployments[token.symbol] = delegator.address;
    writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));
  }
}
