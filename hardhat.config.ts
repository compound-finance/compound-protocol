import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import { task, subtask } from "hardhat/config";
import { getAllFilesMatching } from "hardhat/internal/util/fs-utils";
import * as path from 'path';
import { TASK_NODE_SERVER_READY, TASK_NODE, TASK_TEST_GET_TEST_FILES, TASK_TEST } from "hardhat/builtin-tasks/task-names";
// import "@openzeppelin/hardhat-upgrades";
// import "hardhat-contract-sizer";

import { HardhatUserConfig } from "hardhat/config";

import * as dotenv from "dotenv";

import * as tdly from "@tenderly/hardhat-tenderly";

tdly.setup({
  automaticVerifications: true // automatically verifies contracts !!
});

dotenv.config({ path: __dirname + "/.env" });

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
    localhost: {
      allowUnlimitedContractSize: true,
      forking: {
        url: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
        enabled: true,
        ignoreUnknownTxType: true,
      }
    }
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env["ETHERSCAN_API_KEY"],
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
};

task('node:test').setAction(async (taskArgs, hre, runSuper) => {
  subtask(TASK_NODE_SERVER_READY).setAction(async (taskArgs, hre, runSuper) => {
    await hre.network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          allowUnlimitedContractSize: true,
          forking: {
            jsonRpcUrl: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
            enabled: true,
            ignoreUnknownTxType: true,
          },
        },
      ],
    })
    console.log('Set up forked network');
    runSuper(taskArgs);
  });
  await hre.run(TASK_NODE);
});

export default config;
