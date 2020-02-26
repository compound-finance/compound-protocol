pragma solidity ^0.5.12;

import "../../contracts/PriceOracle.sol";

contract FixedPriceOracle is PriceOracle {
    uint public price;
    bool public constant isPriceOracle = true;

    constructor(uint _price) public {
        price = _price;
    }

    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        cToken;
        return price;
    }

    function assetPrices(address asset) public view returns (uint) {
        asset;
        return price;
    }
}
