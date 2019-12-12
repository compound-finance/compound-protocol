pragma solidity ^0.5.12;

import "../../contracts/CEther.sol";
import "./ComptrollerScenario.sol";

contract CEtherScenario is CEther {
    uint reserveFactor;

    constructor(string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_,
                ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa)
        CEther(comptroller_,
               interestRateModel_,
               initialExchangeRateMantissa,
               name_,
               symbol_,
               decimals_,
               admin_) public {
    }

    function setTotalBorrows(uint totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function donate() public payable {
        // no-op
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
