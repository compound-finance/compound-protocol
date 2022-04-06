pragma solidity ^0.5.16;

import "../../contracts/PriceOracleProxy.sol";


contract PriceOracleProxyHarness is PriceOracleProxy {
    uint public blockTimestamp;

    constructor(address admin_, address baseTokenAddress_) PriceOracleProxy(admin_, baseTokenAddress_) public {}

    function setBlockTimestamp(uint timestamp) public {
        blockTimestamp = timestamp;
    }

    function getBlockTimestamp() public view returns (uint) {
        return blockTimestamp;
    }
}