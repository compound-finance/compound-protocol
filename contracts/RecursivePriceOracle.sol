pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./ChainlinkPriceOracle.sol";
import "./ComptrollerStorage.sol";
import "./CToken.sol";
import "./CErc20.sol";

/**
 * @title RecursivePriceOracle
 * @notice Returns prices from other cTokens (from Compound or from Fuse).
 * @dev Implements `PriceOracle`.
 * @author David Lucid <david@rari.capital>
 */
contract RecursivePriceOracle is PriceOracle {
    /**
     * @dev Returns the price in ETH of the token underlying `cToken` (implements `PriceOracle`).
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        // Get cToken's underlying cToken
        CToken underlying = CToken(CErc20(address(cToken)).underlying());

        // Get Comptroller
        ComptrollerV1Storage comptroller = ComptrollerV1Storage(address(underlying.comptroller()));

        // Check for Compound Comptroller
        if (address(comptroller) == 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B) {
            // If cETH, return cETH/ETH exchange rate
            if (compareStrings(underlying.symbol(), "cETH")) return underlying.exchangeRateStored();

            // Compound cErc20: cToken/token price * token/USD price / ETH/USD price = cToken/ETH price
            (, int256 usdPerEth, , , ) = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419).latestRoundData();
            if (usdPerEth <= 0) return 0;
            return mul(underlying.exchangeRateStored(), comptroller.oracle().getUnderlyingPrice(underlying)) / mul(uint256(usdPerEth), 1e10);
        }

        // If cETH, return cETH/ETH exchange rate
        if (address(comptroller) == 0x3d5BC3c8d13dcB8bF317092d84783c2697AE9258) {
            // Cream
            if (compareStrings(underlying.symbol(), "cETH")) return underlying.exchangeRateStored();
        } else if (underlying.isCEther()) {
            // Fuse
            return underlying.exchangeRateStored();
        }

        // Fuse cTokens: cToken/token price * token/ETH price = cToken/ETH price
        return mul(underlying.exchangeRateStored(), comptroller.oracle().getUnderlyingPrice(underlying)) / 1e18;
    }

    /**
     * @dev Compares two strings.
     */
    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    /// @dev Overflow proof multiplication
    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) return 0;
        uint c = a * b;
        require(c / a == b, "multiplication overflow");
        return c;
    }
}
