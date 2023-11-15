import _ from "lodash";
import { ethers } from "ethers";
import deployContract from "./contract";
import { config } from "./config";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { CTokenConfig, Erc20ConstructorArgs } from "./types";

export async function deployTestToken(deployer: Deployer): Promise<ethers.Contract> {
  const initialAmount: ethers.BigNumber = ethers.utils.parseEther("10000000");
  const tokenName: string = "TestUSD";
  const decimalUnits: number = 18;
  const tokenSymbol: string = "TEST";
  const testUsdArgs: Erc20ConstructorArgs = [
    initialAmount,
    tokenName,
    decimalUnits,
    tokenSymbol
  ];

  const tUsd: ethers.Contract = await deployContract(
    deployer,
    "contracts/core/tests/Contracts/ERC20.sol:StandardToken",
    testUsdArgs
  );

  deployer.hre.recordTokenAddress("test", tUsd.address);

  return tUsd;
}

export async function deployTestTokenAll(deployer: Deployer): Promise<ethers.Contract[]> {
  const testTokens: ethers.Contract[] = [];

  const cTokenConfigs: CTokenConfig[] = _.union(...config.pools.map((pool) => pool.markets));

  // Must complete txs sequentially for correct nonce
  for (const config of cTokenConfigs) {
    const { underlying } = config;

    const initialAmount: ethers.BigNumber = ethers.utils.parseEther("10000000");
    const tokenName: string = `Test ${underlying.toUpperCase()}`;
    const decimalUnits: number = 18;
    const tokenSymbol: string = underlying.toUpperCase();
    const testUsdArgs: Erc20ConstructorArgs = [
        initialAmount,
        tokenName,
        decimalUnits,
        tokenSymbol
    ];

    const testToken: ethers.Contract = await deployContract(
        deployer,
        "contracts/core/tests/Contracts/ERC20.sol:StandardToken",
        testUsdArgs
    );

    testTokens.push(testToken);

    deployer.hre.recordTokenAddress(underlying, testToken.address);
  }

  return testTokens;
}
