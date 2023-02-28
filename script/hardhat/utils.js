const { BigNumber, utils } = require("ethers");
const fs = require("fs");
const path = require("path");

const addressFile = "contract-addresses.json";

const toBN = (value, scale = 18) => {
  return utils.parseEther(value);
};

function getSavedContractAddresses() {
  let json;
  try {
    json = fs.readFileSync(path.join(__dirname, `../../${addressFile}`));
  } catch (err) {
    json = "{}";
  }
  const addrs = JSON.parse(json);
  return addrs;
}

function saveContractAddress(network, contract, address) {
  const addrs = getSavedContractAddresses();
  addrs[network] = addrs[network] || {};
  addrs[network][contract] = address;
  
  fs.writeFileSync(
    path.join(__dirname, `../../${addressFile}`),
    JSON.stringify(addrs, null, "    ")
  );
}

module.exports = {
  toBN,
  getSavedContractAddresses,
  saveContractAddress,
};
