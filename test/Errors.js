"use strict";

/*
 * This module loads Error and FailureInfo enum from ErrorReporter.sol.
 */

const path = require('path');
const solparse = require('solparse');

const errorReporterPath = path.join(__dirname, '..', 'contracts', 'ErrorReporter.sol');
const contents = solparse.parseFile(errorReporterPath);
const [
  ComptrollerErrorReporter,
  TokenErrorReporter,
  OracleErrorReporter
] = contents.body.filter(k => k.type === 'ContractStatement');

function invert(object) {
  return Object.entries(object).reduce((obj, [key, value]) => ({ ...obj, [value]: key }), {});
}

function parse(reporter) {
  const ErrorInv = reporter.body.find(k => k.name == 'Error').members;
  const FailureInfoInv = reporter.body.find(k => k.name == 'FailureInfo').members;
  const Error = invert(ErrorInv);
  const FailureInfo = invert(FailureInfoInv);
  return {Error, FailureInfo, ErrorInv, FailureInfoInv};
}

const carefulMathPath = path.join(__dirname, '..', 'contracts', 'CarefulMath.sol');
const CarefulMath = solparse.parseFile(carefulMathPath).body.find(k => k.type === 'ContractStatement');
const MathErrorInv = CarefulMath.body.find(k => k.name == 'MathError').members;
const MathError = invert(MathErrorInv);

const whitePaperModelPath = path.join(__dirname, '..', 'contracts', 'WhitePaperInterestRateModel.sol');
const whitePaperModel = solparse.parseFile(whitePaperModelPath).body.find(k => k.type === 'ContractStatement');
const IRErrorInv = whitePaperModel.body.find(k => k.name == 'IRError').members;
const IRError = invert(IRErrorInv);

module.exports = {
  ComptrollerErr: parse(ComptrollerErrorReporter),
  OracleErr: parse(OracleErrorReporter),
  TokenErr: parse(TokenErrorReporter),
  IRErr: {
    Error: IRError,
    ErrorInv: IRErrorInv
  },
  MathErr: {
    Error: MathError,
    ErrorInv: MathErrorInv
  }
};
