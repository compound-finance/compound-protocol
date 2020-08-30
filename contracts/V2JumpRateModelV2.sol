pragma solidity ^0.5.16;

import "./BaseJumpRateModelV2.sol";
import "./InterestRateModelV2.sol";


/**
  * @title Compound's JumpRateModel Contract V2
  * @author Compound (modified by Dharma Labs)
  * @notice Version 2 modifies Version 1 by enabling updateable parameters.
  */
contract V2JumpRateModelV2 is InterestRateModelV2, BaseJumpRateModelV2  {
    function getBorrowRate(uint cash, uint borrows, uint reserves) external view returns (uint) {
        return getBorrowRateInternal(cash, borrows, reserves);
    }
}
