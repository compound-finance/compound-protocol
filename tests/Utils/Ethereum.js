"use strict";

const BigNum = require('bignumber.js');
const ethers = require('ethers');

function address(n) {
  return `0x${n.toString(16).padStart(40, '0')}`;
}

function bigNumberify(num) {
  return ethers.utils.bigNumberify(new BigNum(num).toFixed());
}

function encodeParameters(types, values) {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}

async function etherBalance(addr) {
  return ethers.utils.bigNumberify(new BigNum(await web3.eth.getBalance(addr)).toFixed());
}

async function etherGasCost(receipt) {
  const tx = await web3.eth.getTransaction(receipt.transactionHash);
  const gasUsed = new BigNum(receipt.gasUsed);
  const gasPrice = new BigNum(tx.gasPrice);
  return ethers.utils.bigNumberify(gasUsed.times(gasPrice).toFixed());
}

function etherMantissa(num) {
  if (num < 0)
    return ethers.utils.bigNumberify(new BigNum(2).pow(256).plus(num).toFixed());
  return ethers.utils.bigNumberify(new BigNum(num).times(1e18).toFixed());
}

function etherUnsigned(num) {
  return ethers.utils.bigNumberify(new BigNum(num).toFixed());
}

function getContractDefaults() {
  return { gas: 20000000, gasPrice: 20000 };
}

function keccak256(values) {
  return ethers.utils.keccak256(values);
}

function unlockedAccounts() {
  let provider = web3.currentProvider;
  if (provider._providers)
    provider = provider._providers.find(p => p._ganacheProvider)._ganacheProvider;
  return provider.manager.state.unlocked_accounts;
}

function unlockedAccount(a) {
  return unlockedAccounts()[a.toLowerCase()];
}

async function mineBlock() {
  return rpc({ method: 'evm_mine' });
}

async function increaseTime(seconds) {
  await rpc({ method: 'evm_increaseTime', params: [seconds] });
  return rpc({ method: 'evm_mine' });
}

async function setTime(seconds) {
  await rpc({ method: 'evm_setTime', params: [new Date(seconds * 1000)] });
}

async function freezeTime(seconds) {
  await rpc({ method: 'evm_freezeTime', params: [seconds] });
  return rpc({ method: 'evm_mine' });
}

async function advanceBlocks(blocks) {
  let { result: num } = await rpc({ method: 'eth_blockNumber' });
  await rpc({ method: 'evm_mineBlockNumber', params: [blocks + parseInt(num)] });
}

async function minerStart() {
  return rpc({ method: 'miner_start' });
}

async function minerStop() {
  return rpc({ method: 'miner_stop' });
}

async function rpc(request) {
  return new Promise((okay, fail) => web3.currentProvider.send(request, (err, res) => err ? fail(err) : okay(res)));
}

async function both(contract, method, args = [], opts = {}) {
  const reply = await call(contract, method, args, opts);
  const receipt = await send(contract, method, args, opts);
  return { reply, receipt };
}

async function sendFallback(contract, opts = {}) {
  const receipt = await web3.eth.sendTransaction({ to: contract._address, ...Object.assign(getContractDefaults(), opts) });
  return Object.assign(receipt, { events: receipt.logs });
}

module.exports = {
  address,
  bigNumberify,
  encodeParameters,
  etherBalance,
  etherGasCost,
  etherMantissa,
  etherUnsigned,
  keccak256,
  unlockedAccounts,
  unlockedAccount,

  advanceBlocks,
  freezeTime,
  increaseTime,
  mineBlock,
  minerStart,
  minerStop,
  rpc,
  setTime,

  both,
  sendFallback
};
