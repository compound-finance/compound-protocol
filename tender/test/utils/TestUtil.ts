import {
  JsonRpcSigner,
  JsonRpcProvider,
  ExternalProvider,
} from "@ethersproject/providers";
import { Wallet, Contract, BigNumber } from "ethers";
import { formatEther, formatUnits } from "ethers/lib/utils";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import * as hre from "hardhat";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();
import * as ethers from "ethers";
import axios from "axios";

const hreProvider = hre.network.provider;
const accounts = {};
// eslint disable-next-line

const arbiscanKey = process.env.ARBISCAN_KEY;
const arbiscanUrl =
  "https://api.arbiscan.io/api?module=contract&action=getabi&apikey=" +
  arbiscanKey +
  "&address=";

export const getAbiFromArbiscan = async function(address) {
  const url = arbiscanUrl + address;
  return axios
    .get(url)
    .then((resp) => {
      return resp.data;
    })
    .then(async (json) => {
      try {
        return JSON.parse(json.result);
      } catch (e) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return await getAbiFromArbiscan(address);
      }
    });
};

export const getWallet = async (walletAddress, provider) => {
  if (!accounts[walletAddress]) {
    await impersonateAccount(walletAddress, provider);
    accounts[walletAddress] = provider.getSigner(walletAddress);
  }
  return accounts[walletAddress];
};

export const getDeployments = (deploymentFile?: string) => {
  deploymentFile = deploymentFile
    ? `../../../deployments/${deploymentFile}.json`
    : `../../../deployments/arbitrum.json`;
  const deploymentsPath = resolve(__dirname, deploymentFile);
  try {
    const file = fs.readFileSync(deploymentsPath, "utf8");
    const json = JSON.parse(file);
    return json;
  } catch (e) {
    console.log(`e`, e);
  }
};

export const parseAbiFromJson = (fpath: string) => {
  try {
    const file = fs.readFileSync(fpath, "utf8");
    const json = JSON.parse(file);
    const abi = json.abi;
    return abi;
  } catch (e) {
    console.log(`e`, e);
  }
};

export const initContractInstance = (
  contractName: string,
  address: string,
  signer: JsonRpcSigner
) => {
  const abiPath = resolve(
    __dirname,
    `../../../artifacts/contracts/${contractName}.sol/${contractName}.json`
  );
  const abi = parseAbiFromJson(abiPath);
  return new ethers.Contract(address, abi, signer);
};

const impersonateAccount = async (
  address: string,
  provider: JsonRpcProvider
) => {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await provider.getSigner(address);
};

export const resetNetwork = async () => {
  await hre.network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        allowUnlimitedContractSize: true,
        forking: {
          jsonRpcUrl: process.env["ARBITRUM_RPC"],
          enabled: true,
          ignoreUnknownTxType: true,
        },
      },
    ],
  });
};
