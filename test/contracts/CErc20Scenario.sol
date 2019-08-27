pragma solidity ^0.5.8;

import "../CErc20.sol";
import "./ComptrollerScenario.sol";

contract CErc20Scenario is CErc20 {
    constructor(address underlying_,
                ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa,
                string memory name_,
                string memory symbol_,
                uint decimals_)
    CErc20(
    underlying_,
    comptroller_,
    interestRateModel_,
    initialExchangeRateMantissa,
    name_,
    symbol_,
    decimals_) public {}

    function setTotalBorrows(uint totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint totalReserves_) public {
        totalReserves = totalReserves_;
    }

    /**
      * @dev Function to simply retrieve block number
      *      This exists mainly for inheriting test contracts to stub this result.
      */
    function getBlockNumber() internal view returns (uint) {
        ComptrollerScenario comptrollerScenario = ComptrollerScenario(address(comptroller));

        return comptrollerScenario.blockNumber();
    }
}
