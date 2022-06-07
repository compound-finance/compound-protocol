pragma solidity ^0.8.10;

import "../../../contracts/InterestRateModel.sol";

contract InterestRateModelModel is InterestRateModel {
    uint borrowDummy;
    uint supplyDummy;

    function isInterestRateModel() override external pure returns (bool) {
        return true;
    }

    function getBorrowRate(uint _cash, uint _borrows, uint _reserves) override external view returns (uint) {
        return borrowDummy;
    }

    function getSupplyRate(uint _cash, uint _borrows, uint _reserves, uint _reserveFactorMantissa) override external view returns (uint) {
        return supplyDummy;
    }
}
