const fs = require('fs');
const path = require('path');

const network = process.env['NETWORK'];
const jsonPath = `networks/${network}.json`;
const contractsPath = `networks/${network}-contracts.json`;
const buildDirectory = process.env['BUILD_DIRECTORY'];
const networkId = process.env['NETWORK_ID'];
let jsonRaw;
let json;

function error(msg, e=undefined) {
  console.error(msg);
  if (e) {
    console.error(e);
  }

  process.exit(1);
}

if (!buildDirectory) {
  error(`required env $BUILD_DIRECTORY not set`);
}

if (!network) {
  error(`required env NETWORK not set`);
}

function readJson(filePath) {
  let json, jsonRaw;

  try {
    jsonRaw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    error(`cannot read \`${filePath}\`, try running \`yarn run deploy\` first`, e)
  }

  try {
    json = JSON.parse(jsonRaw);
  } catch (e) {
    error(`cannot parse \`${filePath}\` as JSON. You may delete this file and redeploy.`, e);
  }

  return json;
}

json = readJson(jsonPath);
contracts = readJson(contractsPath);

const contractTypes = {
  PriceOracle: {
    singleton: true
  },
  Maximillion: {
    singleton: true
  },
  Comptroller: {},
  Tokens: {}
}

fs.mkdirSync(path.join(buildDirectory, 'contracts'), { recursive: true });

let abis = {};

Object.entries(contracts['contracts']).forEach(([key, values]) => {
  let [_, contractName] = key.split(':', 2);

  abis[contractName] = values['abi'];
});

function addContract(key, contract, address) {
  console.info(`${key} (${contract}): ${address}`);

  const json = {
    contractName: key,
    abi: abis[contract],
    networks: {
      [networkId]: {
        address: address
      }
    }
  };

  fs.writeFileSync(path.join(buildDirectory, 'contracts', `${key}.json`), JSON.stringify(json));
}

Object.entries(contractTypes).forEach(([key, {singleton}]) => {
  if (singleton) {
    if (json[key] && json[key].address) {
      addContract(key, json.contract || key, json[key].address);
    }
  } else {
    Object.entries(json[key]).forEach(([subKey, subJson]) => {
      if (subJson.address) {
        addContract(subKey, subJson.contract || subKey, subJson.address);
      }
    });
  }
});
