pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./ChainlinkPriceOracle.sol";
import "./CErc20.sol";

contract PreferredPriceOracle is PriceOracle { 
    ChainlinkPriceOracle public chainlinkOracle;
    PriceOracle public secondaryOracle;
    
    constructor(ChainlinkPriceOracle _chainlinkOracle, PriceOracle _secondaryOracle) public {
        require(address(_chainlinkOracle) != address(0), "ChainlinkPriceOracle not set.");
        require(address(_secondaryOracle) != address(0), "Secondary price oracle not set.");
        chainlinkOracle = _chainlinkOracle;
        secondaryOracle = _secondaryOracle;
    }

    /**
     * @dev Returns the price in ETH of the token underlying `cToken` (implements `PriceOracle`).
     */
    function getUnderlyingPrice(CToken cToken) external view returns (uint) {
        if (cToken.isCEther() || address(CErc20(address(cToken)).underlying()) == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) {
            return 1e18;
        } else {
            AggregatorV3Interface chainlinkPriceFeed = chainlinkOracle.priceFeeds(address(CErc20(address(cToken)).underlying()));

            if (address(chainlinkPriceFeed) != address(0)) {
                return chainlinkOracle.getUnderlyingPrice(cToken);
            } else {
                return secondaryOracle.getUnderlyingPrice(cToken);
            }
        }
    }
}
