// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./BaseJumpRateModelV2.sol";
import "./InterestRateModel.sol";


/**
  * @title Compound's JumpRateModel Contract V2 for V2 cTokens
  * @author Arr00
  * @notice Supports only for V2 cTokens
  */
abstract contract JumpRateModelV2 is InterestRateModel, BaseJumpRateModelV2 {

	/**
     * @notice Calculates the current borrow rate per block
     * @param cash The amount of cash in the market
     * @param borrows The amount of borrows in the market
     * @param reserves The amount of reserves in the market
     * @return The borrow rate percentage per block as a mantissa (scaled by 1e18)
     */
    function getBorrowRate(uint cash, uint borrows, uint reserves) external view override returns (uint) {
        return getBorrowRateInternal(cash, borrows, reserves);
    }

    function getSupplyRate(uint cash, uint borrows, uint reserves, uint reserveFactorMantissa) public view override(BaseJumpRateModelV2, InterestRateModel) returns (uint) {
        return BaseJumpRateModelV2.getSupplyRate(cash, borrows, reserves, reserveFactorMantissa);
    }

    constructor(uint baseRatePerYear, uint multiplierPerYear, uint jumpMultiplierPerYear, uint kink_, address owner_)
    	BaseJumpRateModelV2(baseRatePerYear,multiplierPerYear,jumpMultiplierPerYear,kink_,owner_) {}
}
