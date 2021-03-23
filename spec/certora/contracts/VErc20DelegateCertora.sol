pragma solidity ^0.5.16;

import "../../../contracts/VErc20Delegate.sol";
import "../../../contracts/EIP20Interface.sol";

import "./VTokenCollateral.sol";

contract VErc20DelegateCertora is VErc20Delegate {
    VTokenCollateral public otherToken;

    function mintFreshPub(address minter, uint mintAmount) public returns (uint) {
        (uint error,) = mintFresh(minter, mintAmount);
        return error;
    }

    function redeemFreshPub(address payable redeemer, uint redeemTokens, uint redeemUnderlying) public returns (uint) {
        return redeemFresh(redeemer, redeemTokens, redeemUnderlying);
    }

    function borrowFreshPub(address payable borrower, uint borrowAmount) public returns (uint) {
        return borrowFresh(borrower, borrowAmount);
    }

    function repayBorrowFreshPub(address payer, address borrower, uint repayAmount) public returns (uint) {
        (uint error,) = repayBorrowFresh(payer, borrower, repayAmount);
        return error;
    }

    function liquidateBorrowFreshPub(address liquidator, address borrower, uint repayAmount) public returns (uint) {
        (uint error,) = liquidateBorrowFresh(liquidator, borrower, repayAmount, otherToken);
        return error;
    }
}
