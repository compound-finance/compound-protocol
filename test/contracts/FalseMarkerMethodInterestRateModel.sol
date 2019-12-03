pragma solidity ^0.5.12;

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

    function getBorrowRate(uint _cash, uint _borrows, uint _reserves) view public returns (uint) {
        _cash;     // unused
        _borrows;  // unused
        _reserves; // unused
        return borrowRate;
    }

    function getSupplyRate(uint _cash, uint _borrows, uint _reserves, uint _reserveFactor) external view returns (uint) {
        _cash;     // unused
        _borrows;  // unused
        _reserves; // unused
        return borrowRate * (1 - _reserveFactor);
    }
}