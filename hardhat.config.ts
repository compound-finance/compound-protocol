import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import { existsSync } from "fs";

// import "@openzeppelin/hardhat-upgrades";
// import "hardhat-contract-sizer";

import { HardhatUserConfig } from "hardhat/config";

import * as dotenv from "dotenv";

import * as tdly from "@tenderly/hardhat-tenderly";

dotenv.config({ path: __dirname + "/.env" });

function getEnvVariableOrFail(name: string): string {
  let value = process.env[name]

  if (typeof value === "string") {
    return value
  }

  console.error(`${name} is not defined in the environment`)
  process.exit(1)
}

const ARBITRUM_RPC = getEnvVariableOrFail("ARBITRUM_RPC")
const ETHERSCAN_API_KEY = getEnvVariableOrFail("ETHERSCAN_API_KEY")
const PRIVATE_KEY = getEnvVariableOrFail("PRIVATE_KEY")


function getHomeDir() {
  return process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
}

if (existsSync(`${getHomeDir()}/.tenderly/config.yaml`)) {
  const automaticVerifications =
    process.env["AUTOMATIC_VERIFICATIONS"] == "0" ? false : true;
  tdly.setup({
    automaticVerifications: automaticVerifications, // automatically verifies contracts !!
  });
}
const config: HardhatUserConfig = {
  networks: {
    arbitrum: {
      url: ARBITRUM_RPC,
      accounts: [PRIVATE_KEY],
    },
    mainnet: {
      url: ARBITRUM_RPC,
      accounts: [PRIVATE_KEY],
    },
    ropsten: {
      url: process.env["ROPSTEN_RPC"] || "https://ropsten.infura.io/v3/",
      accounts: [PRIVATE_KEY],
    },
    metis: {
      url: process.env["METIS_RPC"] || "https://andromeda.metis.io/?owner=1088",
      accounts: [PRIVATE_KEY],
    },
    stardust: {
      url: "https://stardust.metis.io/?owner=588",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      allowUnlimitedContractSize: true,
      forking: {
        url: process.env["ARBITRUM_RPC"] || "",
        blockNumber: 38930690,
        enabled: true,
      },
    },
  },

  etherscan: {
    apiKey: {
      arbitrumOne: ETHERSCAN_API_KEY,
    } 
  },
  
  solidity: {
    version: "0.8.10",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 100000000,
  },
  paths: {
    tests: "tender/test",
  },
};

export default config;
