import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import { task, subtask } from "hardhat/config";
import { getAllFilesMatching } from "hardhat/internal/util/fs-utils";
import * as path from 'path';
import {
 TASK_NODE,
 TASK_TEST,
 TASK_NODE_GET_PROVIDER,
 TASK_NODE_SERVER_READY,
 TASK_TEST_GET_TEST_FILES,
 TASK_TEST_RUN_MOCHA_TESTS
} from "hardhat/builtin-tasks/task-names";

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

// initialize localhost testing server
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
    await runSuper(taskArgs);
  });
  await hre.run(TASK_NODE);
});

// connect to localhost testing server and run tests
task('test:local').setAction(async (taskArgs, hre, runSuper) => {
  subtask(TASK_TEST_RUN_MOCHA_TESTS).setAction(async (taskArgs, hre, runSuper) => {
    const fpath = path.join(__dirname, 'tender/test/test.ts');
    taskArgs.testFiles = [fpath];
    await runSuper(taskArgs);
  });
  config.defaultNetwork = 'localhost',
  await hre.run(TASK_TEST_RUN_MOCHA_TESTS);
});

// both start localhost testing server and run tests
task('test:unified').setAction(async (taskArgs, hre, runSuper) => {
  subtask(TASK_NODE_SERVER_READY).setAction(async (taskArgs, hre, runSuper) => {
    await hre.network.provider.request({
      method: "hardhat_setLoggingEnabled",
      params: [false],
    });
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
    await hre.network.provider.request({
      method: "hardhat_setLoggingEnabled",
      params: [false],
    });
    subtask(TASK_TEST_RUN_MOCHA_TESTS).setAction(async (taskArgs, hre, runSuper) => {
      const fpath = path.join(__dirname, 'tender/test/test.ts');
      taskArgs.testFiles = [fpath];
      await runSuper(taskArgs);
    });
    await hre.run(TASK_TEST_RUN_MOCHA_TESTS);
    process.exit(0);
    // await runSuper(taskArgs);
  });
  await hre.run(TASK_NODE);
});

export default config;
