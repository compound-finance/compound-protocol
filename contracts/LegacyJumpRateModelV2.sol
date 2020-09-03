pragma solidity ^0.5.16;

import "./BaseJumpRateModelV2.sol";
import "./LegacyInterestRateModel.sol";


/**
  * @title Compound's JumpRateModel Contract V2 for legacy cTokens
  * @author Arr00
  * @notice Version 2 modifies Version 1 by enabling updateable parameters. Works only for legacy cTokens
  */
contract LegacyJumpRateModelV2 is LegacyInterestRateModel, BaseJumpRateModelV2  {
    function getBorrowRate(uint cash, uint borrows, uint reserves) external view returns (uint, uint) {
        return (0,getBorrowRateInternal(cash, borrows, reserves));
    }
    constructor(uint baseRatePerYear, uint multiplierPerYear, uint jumpMultiplierPerYear, uint kink_, address owner_) BaseJumpRateModelV2(baseRatePerYear,multiplierPerYear,jumpMultiplierPerYear,kink_,owner_) public {}
}
