pragma solidity ^0.5.16;

import "./PriceOracle.sol";

contract BasePriceOracle is PriceOracle {
    /**
      * @notice Get the price of an underlying asset
      * @param underlying The underlying asset to get the price of
      * @return The underlying asset price in ETH as a mantissa (scaled by 1e18).
      *  Zero means the price is unavailable.
      */
    function price(address underlying) external view returns (uint);
}
