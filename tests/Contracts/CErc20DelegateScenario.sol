pragma solidity ^0.5.12;

import "../../contracts/CErc20Delegate.sol";
import "./ComptrollerScenario.sol";

contract CErc20DelegateScenario is CErc20Delegate {
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
