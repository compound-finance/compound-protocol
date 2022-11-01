import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import { task, subtask } from "hardhat/config";
import { existsSync } from "fs";
import * as path from "path";
import {
  TASK_NODE,
  TASK_TEST,
  TASK_NODE_GET_PROVIDER,
  TASK_NODE_SERVER_READY,
  TASK_TEST_GET_TEST_FILES,
  TASK_TEST_RUN_MOCHA_TESTS,
} from "hardhat/builtin-tasks/task-names";

// import "@openzeppelin/hardhat-upgrades";
// import "hardhat-contract-sizer";

import { HardhatUserConfig } from "hardhat/config";

import * as dotenv from "dotenv";

import * as tdly from "@tenderly/hardhat-tenderly";

dotenv.config({ path: __dirname + "/.env" });

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
      url: process.env["ARBITRUM_RPC"] || "",
      accounts: [process.env["PRIVATE_KEY"] || ""],
    },
    mainnet: {
      url: process.env["ARBITRUM_RPC"] || "",
      accounts: [process.env["PRIVATE_KEY"] || ""],
    },
    ropsten: {
      url: process.env["ROPSTEN_RPC"] || "https://ropsten.infura.io/v3/",
      accounts: [process.env["PRIVATE_KEY"] || ""],
    },
    metis: {
      url: process.env["METIS_RPC"] || "https://andromeda.metis.io/?owner=1088",
      accounts: [process.env["PRIVATE_KEY"] || ""],
    },
    stardust: {
      url: "https://stardust.metis.io/?owner=588",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      allowUnlimitedContractSize: true,
      forking: {
        url: process.env["ARBITRUM_RPC"],
        enabled: true,
      },
    },
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
};

export default config;
