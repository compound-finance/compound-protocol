pragma solidity ^0.5.12;

import "../../contracts/CErc20Immutable.sol";
import "./ComptrollerScenario.sol";

contract CErc20Scenario is CErc20Immutable {
    constructor(address underlying_,
                ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_)
    CErc20Immutable(
    underlying_,
    comptroller_,
    interestRateModel_,
    initialExchangeRateMantissa_,
    name_,
    symbol_,
    decimals_,
    admin_) public {}

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
