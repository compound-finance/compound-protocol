import 'dotenv/config';

import { HardhatUserConfig } from 'hardhat/config';
import { Wallet, Provider } from "zksync-web3";

import "@nomiclabs/hardhat-ethers";
import "@matterlabs/hardhat-zksync-deploy";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-verify";

/* note: boolean environment variables are imported as strings */
const { ETH_PK = "", } = process.env;

export function requireEnv(varName, msg?: string): string {
  const varVal = process.env[varName];
  if (!varVal) {
    throw new Error(msg ?? `Missing required environment variable "${varName}"`);
  }
  return varVal;
}

[ "ETH_PK" ].map(v => requireEnv(v));


const config: HardhatUserConfig = {
  zksolc: {
    version: "latest", // Uses latest available in https://github.com/matter-labs/zksolc-bin/
    settings: {},
  },

  defaultNetwork: "zkSyncLocal",

  networks: {
    zkSyncLocal: {
      url: "http://localhost:3050",
      ethNetwork: "http://localhost:8545",
      chainId: 270,
      zksync: true,
    },
    zkSyncTestnet: {
      url: "https://testnet.era.zksync.dev",
      ethNetwork: "goerli", // RPC URL of the network (e.g. `https://goerli.infura.io/v3/<API_KEY>`)
      chainId: 280,
      zksync: true,
      verifyURL: "https://zksync2-testnet-explorer.zksync.dev/contract_verification"  // Verification endpoint
    },
  },

  solidity: {
    version: "0.8.10",
  },
};

extendEnvironment((hre) => {
  const zkSyncProvider = new Provider(hre.network.config.url);
  const ethProvider = new hre.ethers.getDefaultProvider(hre.network.config.ethNetwork);
  const wallet = new Wallet(ETH_PK, zkSyncProvider, ethProvider);
  hre.zkWallet = wallet;
});

module.exports = config;
