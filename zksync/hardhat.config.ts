import "dotenv/config";
import { readFileSync } from "fs";

import { HardhatUserConfig } from "hardhat/config";
import { Wallet, Provider } from "zksync-web3";

import "@nomiclabs/hardhat-ethers";
import prompt from "password-prompt";
import "@matterlabs/hardhat-zksync-deploy";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-verify";

/* note: boolean environment variables are imported as strings */
const { ETH_PK = "", KEYSTORE_PATH = "" } = process.env;

export function requireEnv(varName, msg?: string): string {
  const varVal = process.env[varName];
  if (!varVal) {
    throw new Error(
      msg ?? `Missing required environment variable "${varName}"`
    );
  }
  return varVal;
}

["ETH_PK", "KEYSTORE_PATH"].map(v => requireEnv(v));

export async function getWalletFromPk() {
  const wallet = new Wallet(ETH_PK);
  return wallet;
}

export async function getWalletFromKeystore() {
  const password = await prompt("Password: ", { method: "hide" });

  const keystoreJson = readFileSync(KEYSTORE_PATH);
  let wallet = await Wallet.fromEncryptedJson(keystoreJson, password);

  return wallet;
}

export async function getWallet() {
  const walletFuncs = {
    keystore: getWalletFromKeystore,
    pk: getWalletFromPk
  };

  const wallet = await walletFuncs[hre.network.config.wallet]();

  const zkSyncProvider = new Provider(hre.network.config.url);
  wallet = wallet.connect(zkSyncProvider);

  const ethProvider = new hre.ethers.getDefaultProvider(
    hre.network.config.ethNetwork
  );
  wallet = wallet.connectToL1(ethProvider);

  hre.zkWallet = wallet;

  return wallet;
}

const config: HardhatUserConfig = {
  zksolc: {
    version: "latest", // Uses latest available in https://github.com/matter-labs/zksolc-bin/
    settings: {}
  },

  defaultNetwork: "zkSyncLocal",

  networks: {
    zkSyncLocal: {
      url: "http://localhost:3050",
      ethNetwork: "http://localhost:8545",
      chainId: 270,
      zksync: true,
      wallet: "pk"
    },
    zkSyncTestnet: {
      url: "https://testnet.era.zksync.dev",
      ethNetwork: "goerli", // RPC URL of the network (e.g. `https://goerli.infura.io/v3/<API_KEY>`)
      chainId: 280,
      zksync: true,
      verifyURL:
        "https://zksync2-testnet-explorer.zksync.dev/contract_verification", // Verification endpoint
      wallet: "keystore"
    }
  },

  solidity: {
    version: "0.8.10"
  }
};

extendEnvironment(async hre => {
  hre.getWallet = getWallet;
});

import "./tasks/addCTokenToMarket";
import "./tasks/deployCToken";

module.exports = config;
