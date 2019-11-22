"use strict";

const BigNum = require('bignumber.js');
const ethers = require('ethers');

const {ComptrollerErr, TokenErr, IRErr, MathErr} = require('../Errors');
const {
  last,
  lookup,
  select
} = require('./JS');

async function asIfTesting(env = global) {
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

const assert = Object.assign(global.assert || require('assert'), {
  addressZero: (actual) => {
    assert.equal(actual, address(0), `expected ${address(0)}, but got ${actual}`);
  },

  each: (assertion, actuals, expecteds, reason) => {
    actuals.forEach((actual, i) => assert[assertion](actual, expecteds[i], reason));
  },

  hasTrollError: (actual, expectedErrorName) => assert.hasError(actual, expectedErrorName, ComptrollerErr),
  hasTokenError: (actual, expectedErrorName) => assert.hasError(actual, expectedErrorName, TokenErr),
  hasError: (actual, expectedErrorName, reporter=TokenErr) => {
    let actualErrorCode = actual instanceof Object ? actual[0] : actual;
    assert.equal(actualErrorCode, reporter.Error[expectedErrorName], `expected Error.${expectedErrorName}, instead got Error.${reporter.ErrorInv[actualErrorCode]}`);
  },

  hasLog: (result, event, params, numEq) => {
    const events = result.events;
    const log = lookup(events, event);
    if (!log)
      assert.fail(0, 1, `expected log with event '${event}', found logs with events: ${Object.keys(events)}`);
    if (numEq)
      assert.partNumEqual(log.returnValues, params);
    else
      assert.partEqual(log.returnValues, params);
  },

  hasNoLog: (result, event) => {
    assert.equal(lookup(result.events, event), null);
  },

  hasTrollFailure: (result, err, info, detail=undefined) => assert.hasFailure(result, err, info, detail, ComptrollerErr),
  hasTokenFailure: (result, err, info, detail=undefined) => assert.hasFailure(result, err, info, detail, TokenErr),
  hasFailure: (result, expectedError, expectedInfo, expectedDetail=undefined, reporter=TokenErr) => {
    const events = result.events;
    const log = last(events['Failure']);
    if (!log)
      assert.fail(0, 1, `expected failure, but none found, founds logs with events: ${Object.keys(events)}`);
    const ret = log.returnValues;
    assert.equal(ret.error, reporter.Error[expectedError], `expected Error.${expectedError} (FailureInfo.${expectedInfo}), instead got Error.${reporter.ErrorInv[ret.error]} (FailureInfo.${reporter.FailureInfoInv[ret.info]}) [${ret.detail}]`);
    assert.equal(ret.info, reporter.FailureInfo[expectedInfo], `expected (Error.${expectedError}) FailureInfo.${expectedInfo}, instead got (Error.${reporter.ErrorInv[ret.error]}) FailureInfo.${reporter.FailureInfoInv[ret.info]} [${ret.detail}]`);
    if (expectedDetail !== undefined)
      assert.equal(ret.detail, expectedDetail);
  },

  hasTokenMathFail: (result, info, detail) => {
    assert.hasTokenFailure(result, 'MATH_ERROR', info, detail && (MathErr.Error[detail] || -1));
  },

  hasTrollReject: (result, info, detail) => {
    assert.hasTokenFailure(result, 'COMPTROLLER_REJECTION', info, detail && ComptrollerErr.Error[detail]);
  },

  hasMathErrorTuple: (result, tuple) => assert.hasErrorTuple(result, tuple, MathErr),
  hasTrollErrorTuple: (result, tuple) => assert.hasErrorTuple(result, tuple, ComptrollerErr),
  hasTokenErrorTuple: (result, tuple) => assert.hasErrorTuple(result, tuple, TokenErr),
  hasErrorTuple: (result, tuple, reporter=TokenErr) => {
    assert.hasError(result[0], tuple[0], reporter);
    assert.like(result[1], tuple[1]);
    if (tuple[2] !== undefined)
      assert.like(result[2], tuple[2]);
  },

  like: (actual, expected, reason) => {
    if (typeof(expected) == 'function')
      return expected(actual, reason);
    assert.equal(actual, expected, reason);
  },

  numEqual: (actual, expected, reason) => {
    assert.equal(actual.toString(), expected.toString(), reason);
  },

  numNotEqual: (actual, expected, reason) => {
    assert.notEqual(actual.toString(), expected.toString(), reason);
  },

  partNumEqual: (actual, partial) => {
    for (let key of Object.keys(partial)) {
      assert.numEqual(etherUnsigned(actual[key]), etherUnsigned(partial[key]), `expected ${key} in ${JSON.stringify(actual)} similar to ${JSON.stringify(partial)}`);
    }
  },

  partEqual: (actual, partial, reason) => {
    assert.deepEqual(select(actual, Object.keys(partial)), partial, reason);
  },

  revert: async (trx, reason='revert') => {
    let result;
    try {
      result = await trx;
    } catch (err) {
      assert.equal(err.message, `Returned error: VM Exception while processing transaction: ${reason}`);
      return;
    }
    assert.fail(0, 1, `expected revert, instead got result: ${JSON.stringify(result)}`);
  },

  revertWithError: async (trx, expectedErrorName, reason='revert', reporter=TokenErr) => {
    return assert.revert(trx, `${reason} (${reporter.Error[expectedErrorName].padStart(2, '0')})`)
  },

  succeeds: async (contract, method, args = [], opts = [], reporter=TokenErr) => {
    const {reply, receipt} = await both(contract, method, args, opts);
    assert.success(receipt);
    assert.hasError(reply, 'NO_ERROR', reporter);
  },

  tokenSuccess: (result) => assert.success(result, TokenErr),
  trollSuccess: (result) => assert.success(result, ComptrollerErr),
  success: (result, reporter=TokenErr) => {
    const events = result.events;
    if (events['Failure']) {
      const failure = last(events['Failure']);
      const error = reporter.ErrorInv[failure.returnValues[0]];
      const failureInfo = reporter.FailureInfoInv[failure.returnValues[1]];
      let detail = failure.returnValues[2];
      if (detail && error == 'MATH_ERROR')
        detail = MathErr.ErrorInv[detail];
      assert.fail(0, 1, `expected success, instead got failure: ${JSON.stringify(failure)} (Error: ${error}, FailureInfo: ${failureInfo}, Detail: ${detail})`)
    }
    return result;
  }
});

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
  if (process.env.NETWORK === "coverage")
    return {gas: 0xfffffffffff, gasPrice: 1};
  return {gas: 20000000, gasPrice: 20000};
}

function getContract(name, opts = getContractDefaults(), chosenWeb3 = web3) {
  const code = artifacts.require(name);
  const contract = new chosenWeb3.eth.Contract(code._json.abi, null, {data: code._json.bytecode, ...opts});
  contract.at = (addr) => {
    return new chosenWeb3.eth.Contract(code._json.abi, addr, {data: code._json.bytecode, ...opts});
  }
  return contract;
}

function getTestContract(name, opts) {
  return getContract(name, opts);
}

async function guessRoot() {
  if (!global.accounts)
    global.accounts = await web3.eth.getAccounts();
  return accounts[0];
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
  return new Promise((okay, fail) => web3.currentProvider.send(request, (err, res) => err ? fail(err) : okay(res)));
}

async function both(contract, method, args = [], opts = {}) {
  const reply = await call(contract, method, args, opts);
  const receipt = await send(contract, method, args, opts);
  return {reply, receipt};
}

async function call(contract, method, args = [], opts = {}) {
  const {
    from = await guessRoot(),
    ...etc
  } = opts || {};
  return contract.methods[method](...args).call({from, ...etc});
}

async function callUnsigned(contract, method, args = [], opts = {}) {
  return etherUnsigned(await call(contract, method, args, opts));
}

async function send(contract, method, args = [], opts = {}) {
  const {
    from = await guessRoot(),
    ...etc
  } = opts || {};
  return contract.methods[method](...args).send({from, ...etc});
}

async function sendFallback(contract, opts = {}) {
  const receipt = await web3.eth.sendTransaction({to: contract._address, ...Object.assign(getContractDefaults(), opts)});
  return Object.assign(receipt, {events: receipt.logs});
}

module.exports = {
  asIfTesting,
  assert,
  address,
  bigNumberify,
  encodeParameters,
  etherBalance,
  etherGasCost,
  etherMantissa,
  etherUnsigned,
  getContract,
  getContractDefaults,
  getTestContract,
  guessRoot,
  keccak256,

  minerStart,
  minerStop,
  rpc,

  both,
  call,
  callUnsigned,
  send,
  sendFallback
};
