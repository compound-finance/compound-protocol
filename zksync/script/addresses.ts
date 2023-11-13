import { existsSync, readFileSync, writeFileSync } from "fs";
import _ from "lodash";
import { getChainId } from "./utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { AddressConfig } from "./types";

const MAIN_ADDRESSES_PATH: string = "deploy/addresses/main.json";
const TOKEN_ADDRESSES_PATH: string = "deploy/addresses/tokens.json";
const ZTOKEN_ADDRESSES_PATH: string = "deploy/addresses/zTokens.json";

function getAddressAll(path: string): AddressConfig {
  let addresses: AddressConfig = {};

  if (existsSync(path)) {
    const json: string = readFileSync(path, "utf8");
    addresses = JSON.parse(json);
  }

  return addresses;
}

function getAddress(path: string, hre: HardhatRuntimeEnvironment, name: string): string {
  const addresses: AddressConfig = getAddressAll(path);
  const chainId: number = getChainId(hre);

  const address: string = addresses[name][chainId];

  return address;
}

function recordAddress(
  path: string,
  hre: HardhatRuntimeEnvironment,
  name: string,
  address: string
): void {
  const addresses: AddressConfig = getAddressAll(path);

  const chainId: number = getChainId(hre);
  const newAddresses: AddressConfig = { [name]: { [chainId]: address } };
  const updatedAddresses: AddressConfig = _.merge(addresses, newAddresses);

  const newJson: string = JSON.stringify(updatedAddresses, null, 2);
  writeFileSync(path, newJson);
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
extendEnvironment((hre: HardhatRuntimeEnvironment) => {
  hre.getUnderlyingToken = getAddress.bind(null, TOKEN_ADDRESSES_PATH, hre);
  hre.getCTokenAddress = getAddress.bind(null, ZTOKEN_ADDRESSES_PATH, hre);
  hre.getMainAddress = getAddress.bind(null, MAIN_ADDRESSES_PATH, hre);

  hre.recordMainAddress = recordAddress.bind(null, MAIN_ADDRESSES_PATH, hre);
  hre.recordTokenAddress = recordAddress.bind(null, TOKEN_ADDRESSES_PATH, hre);
  hre.recordCTokenAddress = recordAddress.bind(null, ZTOKEN_ADDRESSES_PATH, hre);
});
