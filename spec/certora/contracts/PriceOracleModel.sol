pragma solidity ^0.8.10;

import "../../../contracts/PriceOracle.sol";

contract PriceOracleModel is PriceOracle {
    uint dummy;

    function isPriceOracle() override external pure returns (bool) {
        return true;
    }

    function getUnderlyingPrice(CToken cToken) override external view returns (uint) {
        return dummy;
    }
}
