import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import { HardhatUserConfig } from "hardhat/config";

import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

const config: HardhatUserConfig = {
  networks: {
    arbitrum: {
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
  },
  etherscan: {
    apiKey: process.env["ETHERSCAN_API_KEY"] || "some-key",
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

export default config;
