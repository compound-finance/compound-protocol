import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { Wallet } from "zksync-web3";
import { getChainId } from "../script/utils";
import { deployMulticall } from "../script/multicall";
import { deployInterestRatePool, deployTestInterestRatePool } from "../script/isolatedPool";

// An example of a deploy script that will deploy and call a simple contract.
export default async function(hre: HardhatRuntimeEnvironment) {
  const chainId: number = getChainId(hre);

  console.log(`Running deploy script for Zoro Protocol`);

  const wallet: Wallet = await hre.getZkWallet();

  // Create deployer object and load the artifact of the contract you want to deploy.
  const deployer: Deployer = new Deployer(hre, wallet);

  // OPTIONAL: Deposit funds to L2
  // Comment this block if you already have funds on zkSync.
  // const depositHandle = await deployer.zkWallet.deposit({
  //   to: deployer.zkWallet.address,
  //   token: utils.ETH_ADDRESS,
  //   amount: deploymentFee.mul(2),
  // });
  // Wait until the deposit is processed on zkSync
  // await depositHandle.wait();

  if (chainId === 270) {
    console.log("Deploying contracts for local test network");

    await deployMulticall(deployer);

    await deployTestInterestRatePool(deployer);
  } else {
    await deployInterestRatePool(deployer);
  }
}
