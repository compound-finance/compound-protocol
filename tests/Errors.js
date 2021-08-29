"use strict";

/*
 * This module loads Error and FailureInfo enum from ErrorReporter.sol.
 */
const fs = require('fs')
const path = require('path');
const solparse = require('@solidity-parser/parser');

const errorReporterPath = path.join(__dirname, '..', 'contracts', 'ErrorReporter.sol');
const errorReporterContest = fs.readFileSync(errorReporterPath)
const contents = solparse.parse(errorReporterContest.toString());
const [
  ComptrollerErrorReporter,
  TokenErrorReporter
] = contents.children.filter(k => k.type === 'ContractDefinition');

function invert(object) {
  return Object.entries(object).reduce((obj, [key, value]) => ({ ...obj, [value]: key }), {});
}

function parse(reporter) {
  const Error = (reporter.subNodes.find(k => k.name == 'Error') || { members: [] }).members.reduce((obj, i, idx) => {
    obj[i.name] = `${idx}`
    return obj
  }, {});
  const FailureInfo = (reporter.subNodes.find(k => k.name == 'FailureInfo')  || { members: [] }).members.reduce((obj, i, idx) => {
    obj[i.name] = `${idx}`
    return obj
  }, {});
  const CustomErrors = reporter.subNodes.filter(k => k.type === 'CustomErrorDefinition').reduce((obj, i) => {
    obj[i.name] = {
      type: 'function',
      name: i.name,
      inputs: i.parameters.map(p => ({ name: p.name, type: p.typeName.name }))
    };
    return obj;
  }, {})
  const ErrorInv = invert(Error);
  const FailureInfoInv = invert(FailureInfo);
  return {Error, FailureInfo, ErrorInv, FailureInfoInv, CustomErrors};
}

// const carefulMathPath = path.join(__dirname, '..', 'contracts', 'CarefulMath.sol');
// const CarefulMath = solparse.parseFile(carefulMathPath).body.find(k => k.type === 'ContractStatement');
const MathErrorInv = {
  0: "NO_ERROR",
  1: "DIVISION_BY_ZERO",
  2: "INTEGER_OVERFLOW",
  3: "INTEGER_UNDERFLOW",
} // CarefulMath.body.find(k => k.name == 'MathError').members;
const MathError = invert(MathErrorInv);

// const whitePaperModelPath = path.join(__dirname, '..', 'contracts', 'WhitePaperInterestRateModel.sol');
// const whitePaperModel = solparse.parseFile(whitePaperModelPath).body.find(k => k.type === 'ContractStatement');
module.exports = {
  ComptrollerErr: parse(ComptrollerErrorReporter),
  TokenErr: parse(TokenErrorReporter),
  MathErr: {
    Error: MathError,
    ErrorInv: MathErrorInv
  }
};
