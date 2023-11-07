import { existsSync, readFileSync, writeFileSync } from "fs";
import _ from "lodash";
import { AddressConfig } from "./types";

const MAIN_ADDRESSES_PATH: string = "deploy/main.json";
const TOKEN_ADDRESSES_PATH: string = "deploy/tokens.json";
const ZTOKEN_ADDRESSES_PATH: string = "deploy/zTokens.json";

function getAddressAll(path: string): AddressConfig {
  let addresses: AddressConfig = {};

  if (existsSync(path)) {
    const json: string = readFileSync(path, "utf8");
    addresses = JSON.parse(json);
  }

  return addresses;
}

function recordAddress(
  path: string,
  chainId: number,
  name: string,
  address: string
): void {
  const addresses: AddressConfig = getAddressAll(path);

  const newAddresses: AddressConfig = { [name]: { [chainId]: address } };
  const updatedAddresses: AddressConfig = _.merge(addresses, newAddresses);

  const newJson: string = JSON.stringify(updatedAddresses, null, 2);
  writeFileSync(path, newJson);
}

export const getUnderlyingTokens = getAddressAll.bind(
  null,
  TOKEN_ADDRESSES_PATH
);
export const getCTokenAddresses = getAddressAll.bind(
  null,
  ZTOKEN_ADDRESSES_PATH
);
export const getMainAddresses = getAddressAll.bind(null, MAIN_ADDRESSES_PATH);

export const recordMainAddress = recordAddress.bind(null, MAIN_ADDRESSES_PATH);
export const recordTokenAddress = recordAddress.bind(
  null,
  TOKEN_ADDRESSES_PATH
);
export const recordCTokenAddress = recordAddress.bind(
  null,
  ZTOKEN_ADDRESSES_PATH
);
