import hre, { ethers } from "hardhat";
// import { ethers } from "ethers";
// import * as ethers from 'ethers';
import { readFileSync, writeFileSync } from "fs";
import { formatAmount, getUnderlyingBalance } from "./utils/TokenUtil";
import { deploy } from "./deploy/cdelegators";
import { resolve } from "path";

const provider = hre.network.provider;

const test = {
  mintAmount: ".000005",
};

const impersonateAccount = async (address, provider) => {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await provider.getSigner(address);
};

const main = async () => {
  const copyPath = resolve(__dirname, `../../deployments/arbitrum.json`);
  const currentDeployments = JSON.parse(readFileSync(copyPath, "utf-8"));
  const outputFilePath = resolve(
    __dirname,
    `../../deployments/${hre.network.name}.json`
  );
  writeFileSync(outputFilePath, JSON.stringify(currentDeployments, null, 2));

  await deploy(); //updates the deployments file

  const file = readFileSync(outputFilePath, "utf8");
  const deployments = JSON.parse(file);
  // console.log(outputFilePath)
  const delegatorAddress = deployments["tUSDC"];
  const delegateAddress = deployments["tUSDC_delegate"];
  const abiPath = resolve(
    __dirname,
    "../../artifacts/contracts/CErc20Delegate.sol/CErc20Delegate.json"
  );
  const abi = JSON.parse(readFileSync(abiPath, "utf-8")).abi;

  const walletAddress = "0x5B33EC561Cb20EaF7d5b41A9B68A690E2EBBc893";
  const wallet = await ethers.getImpersonatedSigner(walletAddress);

  const cTokenContract = new ethers.Contract(delegatorAddress, abi, wallet);
  const uTokenAddress = await cTokenContract.underlying();

  console.log(await cTokenContract.balanceOf(walletAddress));

  const uTokenContract = new ethers.Contract(uTokenAddress, abi, wallet);
  const underlyingDecimals = await uTokenContract.decimals();
  await uTokenContract.approve(
    cTokenContract.address,
    ethers.constants.MaxInt256
  );
  await uTokenContract.approve(
    await cTokenContract.implementation(),
    ethers.constants.MaxInt256
  );

  const mintAmount = formatAmount(
    test["mintAmount"],
    await uTokenContract.decimals()
  );
  await cTokenContract.mint(mintAmount);
  console.log(await cTokenContract.balanceOf(walletAddress));
};

main();
