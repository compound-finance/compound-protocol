pragma solidity ^0.5.8;

import "../../../contracts/CToken.sol";

contract ComptrollerModel {
    uint mintAllowedResult;
    uint redeemAllowedResult;
    uint borrowAllowedResult;
    uint repayBorrowAllowedResult;
    uint liquidateBorrowAllowedResult;
    uint seizeAllowedResult;
    uint transferAllowedResult;
    uint liquidateCalculateSeizeTokensResult1;
    uint liquidateCalculateSeizeTokensResult2;


    function mintAllowed(CToken cToken, address minter, uint mintAmount) public returns (uint) {
        return mintAllowedResult;
    }

    function mintVerify(CToken cToken, address minter, uint mintAmount, uint mintTokens) external {}


    function redeemAllowed(CToken cToken, address redeemer, uint redeemTokens) public returns (uint) {
        return redeemAllowedResult;
    }

    function redeemVerify(CToken cToken, address redeemer, uint redeemAmount, uint redeemTokens) external {}


    function borrowAllowed(CToken cToken, address borrower, uint borrowAmount) public returns (uint) {
        return borrowAllowedResult;
    }

    function borrowVerify(CToken cToken, address borrower, uint borrowAmount) external {}


    function repayBorrowAllowed(
        address cToken,
        address payer,
        address borrower,
        uint repayAmount) external returns (uint) {
        return repayBorrowAllowedResult;
    }

    function repayBorrowVerify(
        address cToken,
        address payer,
        address borrower,
        uint repayAmount,
        uint borrowerIndex) external {}


    function liquidateBorrowAllowed(
        address cTokenBorrowed,
        address cTokenCollateral,
        address liquidator,
        address borrower,
        uint repayAmount) external returns (uint) {
        return liquidateBorrowAllowedResult;
    }

    function liquidateBorrowVerify(
        address cTokenBorrowed,
        address cTokenCollateral,
        address liquidator,
        address borrower,
        uint repayAmount,
        uint seizeTokens) external {}


    function seizeAllowed(
        address cTokenCollateral,
        address cTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) external returns (uint) {
        return seizeAllowedResult;
    }

    function seizeVerify(
        address cTokenCollateral,
        address cTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) external {}

    function transferAllowed(address cToken, address src, address dst, uint transferTokens) external returns (uint) {
        return transferAllowedResult;
    }

    function transferVerify(address cToken, address src, address dst, uint transferTokens) external {}

    function liquidateCalculateSeizeTokens(
        address cTokenBorrowed,
        address cTokenCollateral,
        uint repayAmount) external view returns (uint, uint) {
        return (liquidateCalculateSeizeTokensResult1, liquidateCalculateSeizeTokensResult2);
    }
}