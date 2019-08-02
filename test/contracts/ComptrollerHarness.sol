pragma solidity ^0.5.8;

import "../Comptroller.sol";
import "../PriceOracle.sol";

contract ComptrollerHarness is Comptroller {
    constructor() Comptroller() public {}

    function getHypotheticalAccountLiquidity(
        address account,
        address cTokenModify,
        uint redeemTokens,
        uint borrowAmount) public view returns (uint, uint, uint) {
        (Error err, uint liquidity, uint shortfall) =
            super.getHypotheticalAccountLiquidityInternal(account, CToken(cTokenModify), redeemTokens, borrowAmount);
        return (uint(err), liquidity, shortfall);
    }
}
