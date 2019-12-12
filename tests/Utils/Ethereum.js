"use strict";

const BigNum = require('bignumber.js');
const ethers = require('ethers');

async function asIfTesting(env = global) {
  // XXXS This obviously will not work
  // Use this from a nodejs-repl, or something, to get a setup like tests have
  const Config = require('truffle-config');
  const Resolver = require('truffle-resolver');
  const TestSource = require('truffle-core/lib/testing/testsource');
  const TestResolver = require('truffle-core/lib/testing/testresolver');
  const config = Config.detect();
  config.network = 'development';
  config.resolver = new Resolver(config);

  const test_source = new TestSource(config);
  const test_resolver = new TestResolver(config.resolver, test_source, config.contracts_build_directory);

  env.web3 = new (require('web3'))(config.provider);
  env.accounts = await env.web3.eth.getAccounts();
  env.artifacts = test_resolver;
  env.artifacts.reset = () => Object.keys(env.artifacts.require_cache).map(k => delete env.artifacts.require_cache[k]);
  env.config = config;
  return env;
}

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
  return {gas: 20000000, gasPrice: 20000};
}

function keccak256(values) {
  return ethers.utils.keccak256(values);
}

async function minerStart() {
  return rpc({method: 'miner_start'});
}

async function minerStop() {
  return rpc({method: 'miner_stop'});
}

async function rpc(request) {
  return new Promise((okay, fail) => saddle.web3.currentProvider.send(request, (err, res) => err ? fail(err) : okay(res)));
}

async function both(contract, method, args = [], opts = {}) {
  const reply = await call(contract, method, args, opts);
  const receipt = await send(contract, method, args, opts);
  return {reply, receipt};
}

async function sendFallback(contract, opts = {}) {
  const receipt = await web3.eth.sendTransaction({to: contract._address, ...Object.assign(getContractDefaults(), opts)});
  return Object.assign(receipt, {events: receipt.logs});
}

module.exports = {
  asIfTesting,
  address,
  bigNumberify,
  encodeParameters,
  etherBalance,
  etherGasCost,
  etherMantissa,
  etherUnsigned,
  keccak256,

  minerStart,
  minerStop,
  rpc,

  both,
  sendFallback
};
