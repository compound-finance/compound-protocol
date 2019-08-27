pragma solidity ^0.5.8;

import "../InterestRateModel.sol";

/**
  * @title Implements the interest rate model marker function but returns false
  * @author Compound
  */
contract FalseMarkerMethodInterestRateModel is InterestRateModel {
    /**
      * For exhaustive testing, this contract implements the marker function but returns false instead of the intended true
      */
    bool public constant isInterestRateModel = false;

    uint borrowRate;

    constructor(uint borrowRate_) public {
        borrowRate = borrowRate_;
    }

    /**
      * @notice Gets the current borrow interest rate based on the given asset, total cash and total borrows
      * @dev The return value should be scaled by 1e18, thus a return value of
      *      `(true, 1000000000000)` implies an interest rate of 0.000001% *per block*.
      * @param _cash The total cash of the asset in the CToken
      * @param _borrows The total borrows of the asset in the CToken
      * @param _reserves The total reserves of the asset in the CToken
      * @return Success or failure and the borrow interest rate per block scaled by 1e18
      */
    function getBorrowRate(uint _cash, uint _borrows, uint _reserves) view public returns (uint, uint) {
        _cash;     // unused
        _borrows;  // unused
        _reserves; // unused
        return (0, borrowRate);
    }
}