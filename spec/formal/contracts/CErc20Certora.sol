pragma solidity ^0.5.8;

import "../../../contracts/CErc20.sol";
import "../../../contracts/EIP20Interface.sol";

import "./CTokenCollateral.sol";
import "./SimulationInterface.sol";

contract CErc20Certora is CErc20 {
    CTokenCollateral public otherToken;

    constructor(address underlying_,
                ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint decimals_) public CErc20(underlying_, comptroller_, interestRateModel_, initialExchangeRateMantissa_, name_, symbol_, decimals_) {
    }

    function comptrollerMintAllowed(address currentContract, address minter, uint mintAmount) public returns (uint) {
        return comptroller.mintAllowed(currentContract, minter, mintAmount);
    }

    function comptrollerRedeemAllowed(address currentContract, address minter, uint mintAmount) public returns (uint) {
        return comptroller.redeemAllowed(currentContract, minter, mintAmount);
    }

    function exchangeRateStoredInternalPub() public view returns (MathError, uint) {
        return exchangeRateStoredInternal();
    }

    function cTokenMintComputation(uint mintAmount) public returns (uint) {
        MathError mathErr;
        uint exchangeRateMantissa;
        uint mintTokens;

        (mathErr, exchangeRateMantissa) = exchangeRateStoredInternal();
        require (mathErr == MathError.NO_ERROR);

        (mathErr, mintTokens) = divScalarByExpTruncate(mintAmount, Exp({mantissa: exchangeRateMantissa}));
        require (mathErr == MathError.NO_ERROR);

        return mintTokens;
    }

    function cTokenRedeemComputation(uint redeemTokens) public returns (uint) {
        MathError mathErr;
        uint exchangeRateMantissa;
        uint redeemAmount;

        (mathErr, exchangeRateMantissa) = exchangeRateStoredInternal();
        require (mathErr == MathError.NO_ERROR);

        (mathErr, redeemAmount) = mulScalarTruncate(Exp({mantissa: exchangeRateMantissa}), redeemTokens);
        require (mathErr == MathError.NO_ERROR);

        return redeemAmount;
    }

    function checkTransferInPub(address from, uint amount) public view returns (uint) {
        return uint(checkTransferIn(from,amount));
    }

    function doTransferInPub(address from, uint amount) public returns (uint) {
        return uint(doTransferIn(from,amount));
    }

    function simulateUnderlying(uint expectedError) internal returns (uint) {
        SimulationInterface token = SimulationInterface(underlying);
        bool result;

        token.dummy();

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            switch returndatasize()
            case 0 {                      // This is a non-standard ERC-20
                result := not(0)          // set result to true
            }
            case 32 {                     // This is a complaint ERC-20
                returndatacopy(0, 0, 32)
                result := mload(0)        // Set `result = returndata` of external call
            }
            default {                     // This is an excessively non-compliant ERC-20, revert.
                revert(0, 0)
            }
        }

        if (!result) {
            return expectedError;
        }

        return uint(Error.NO_ERROR);
    }

    function doTransferInPubSim(address from, uint amount) public returns (uint) {
        return simulateUnderlying(uint(Error.TOKEN_TRANSFER_IN_FAILED));
    }

    function doTransferOutPub(address payable to, uint amount) public returns (uint) {
        return uint(doTransferOut(to, amount));
    }

    function doTransferOutPubSim(address payable to, uint amount) public returns (uint) {
        return simulateUnderlying(uint(Error.TOKEN_TRANSFER_OUT_FAILED));
    }

    function balanceOfInOther(address account) public view returns (uint) {
        return otherToken.balanceOf(account);
    }

    function borrowBalanceStoredInOther(address account) public view returns (uint) {
        return otherToken.borrowBalanceStored(account);
    }

    function exchangeRateStoredInOther() public view returns (uint) {
        return otherToken.exchangeRateStored();
    }

    function getCashInOther() public view returns (uint) {
        return otherToken.getCash();
    }

    function getCashOf(address account) public view returns (uint) {
        return EIP20Interface(underlying).balanceOf(account);
    }

    function getCashOfInOther(address account) public view returns (uint) {
        return otherToken.getCashOf(account);
    }

    function totalSupplyInOther() public view returns (uint) {
        return otherToken.totalSupply();
    }

    function totalBorrowsInOther() public view returns (uint) {
        return otherToken.totalBorrows();
    }

    function totalReservesInOther() public view returns (uint) {
        return otherToken.totalReserves();
    }

    function mintFreshPub(address minter, uint mintAmount) public returns (uint) {
        return mintFresh(minter, mintAmount);
    }

    function redeemFreshPub(address payable redeemer, uint redeemTokens, uint redeemUnderlying) public returns (uint) {
        return redeemFresh(redeemer, redeemTokens, redeemUnderlying);
    }

    function borrowFreshPub(address payable borrower, uint borrowAmount) public returns (uint) {
        return borrowFresh(borrower, borrowAmount);
    }

    function repayBorrowFreshPub(address payer, address borrower, uint repayAmount) public returns (uint) {
        return repayBorrowFresh(payer, borrower, repayAmount);
    }

    function liquidateBorrowFreshPub(address liquidator, address borrower, uint repayAmount) public returns (uint) {
        return liquidateBorrowFresh(liquidator, borrower, repayAmount, otherToken);
    }
}
