pragma solidity ^0.5.12;

import "./CErc20Scenario.sol";

contract CEvil is CErc20Scenario {
    constructor(address underlying_,
                ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_)
    CErc20Scenario(
    underlying_,
    comptroller_,
    interestRateModel_,
    initialExchangeRateMantissa_,
    name_,
    symbol_,
    decimals_,
    admin_) public {}

    function evilSeize(CToken treasure, address liquidator, address borrower, uint seizeTokens) public returns (uint) {
        return treasure.seize(liquidator, borrower, seizeTokens);
    }
}
