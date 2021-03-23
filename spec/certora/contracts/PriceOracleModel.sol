pragma solidity ^0.5.16;

import "../../../contracts/PriceOracle.sol";

contract PriceOracleModel is PriceOracle {
    uint dummy;

    function isPriceOracle() external pure returns (bool) {
        return true;
    }

    function getUnderlyingPrice(VToken vToken) external view returns (uint) {
        return dummy;
    }
}