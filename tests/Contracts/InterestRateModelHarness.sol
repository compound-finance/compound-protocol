// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "../../contracts/InterestRateModel.sol";

/**
  * @title An Interest Rate Model for tests that can be instructed to return a failure instead of doing a calculation
  * @author Compound
  */
contract InterestRateModelHarness is InterestRateModel {
    uint public constant opaqueBorrowFailureCode = 20;
    bool public failBorrowRate;
    uint public borrowRate;

    constructor(uint borrowRate_) {
        borrowRate = borrowRate_;
    }

    function setFailBorrowRate(bool failBorrowRate_) public {
        failBorrowRate = failBorrowRate_;
    }

    function setBorrowRate(uint borrowRate_) public {
        borrowRate = borrowRate_;
    }

    function getBorrowRate(uint _cash, uint _borrows, uint _reserves) override public view returns (uint) {
        _cash;     // unused
        _borrows;  // unused
        _reserves; // unused
        require(!failBorrowRate, "INTEREST_RATE_MODEL_ERROR");
        return borrowRate;
    }

    function getSupplyRate(uint _cash, uint _borrows, uint _reserves, uint _reserveFactor) override external view returns (uint) {
        _cash;     // unused
        _borrows;  // unused
        _reserves; // unused
        return borrowRate * (1 - _reserveFactor);
    }
}
