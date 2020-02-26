pragma solidity ^0.5.12;

import "../../contracts/CDaiDelegate.sol";
import "./ComptrollerScenario.sol";

contract CDaiDelegateScenario is CDaiDelegate {
    constructor() public {}

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
