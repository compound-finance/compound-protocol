pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./CToken.sol";
import "./CErc20.sol";
import "./interfaces/IChainlinkAggregator.sol";
import "./EIP20Interface.sol";

contract PriceOracleProxy is PriceOracle, ExponentialNoError {
    /// @notice Indicator that this is a PriceOracle contract (for inspection)
    bool public constant isPriceOracle = true;

    /// @notice admin can add price aggregators
    address public admin;

    /// @notice chainlink price aggregator for each underlying assets
    mapping(address => IChainlinkAggregator) public aggregators;

    /// @notice fixed price for each underlying assets
    mapping(address => uint) public fixedPrices;

    constructor(address admin_) public {
        admin = admin_;
    }

    /**
     * @notice Get the price of a specific token.
     * @param token The token to get the price of
     * @return The price
     */
    function getTokenPrice(address token) internal view returns (uint256) {
        if (fixedPrices[token] != 0) {
            return fixedPrices[token];
        }

        return getPriceFromChainlink(token);
    }

    /**
      * @notice Get the underlying price of a cToken asset
      * @param cToken The cToken to get the underlying price of
      * @return The underlying asset price mantissa (scaled by 1e18).
      *  Zero means the price is unavailable.
      */
    function getUnderlyingPrice(CToken cToken) external view returns (uint) {
        address cTokenAddress = address(cToken);

        address underlying = CErc20(cTokenAddress).underlying();

        uint price = getTokenPrice(underlying);
        uint256 underlyingDecimals = EIP20Interface(underlying).decimals();

        return mul_(price, 10**(18 - underlyingDecimals));
    }

    /**
     * @notice Get price from ChainLink
     * @param underlying The underlying token that ChainLink aggregator gets the price of
     * @return The price, scaled by 1e18
     */
    function getPriceFromChainlink(address underlying) internal view returns (uint256) {
        IChainlinkAggregator aggregator = aggregators[underlying];

        (, int256 price, , , ) = aggregator.latestRoundData();
        require(price > 0, "invalid price");

        // Extend the decimals to 1e18.
        return mul_(uint256(price), 10**(18 - uint256(aggregator.decimals())));
    }

    /**
     * @notice Set Chainlink aggregator
     * @param underlying The underlying token that ChainLink aggregator gets the price of
     * @param aggregator The Chainlink aggregator to get the price from
     */
    function _setAggregator(address underlying, IChainlinkAggregator aggregator) external {
        require(msg.sender == admin, "Only admin can add aggregator");

        aggregators[underlying] = aggregator;
    }

    /**
     * @notice Set fixed price
     * @param underlying The underlying token to set the price of
     * @param price The price of the token
     */
    function _setFixedPrice(address underlying, uint256 price) external {
        require(msg.sender == admin, "Only admin can set fixed price");

        fixedPrices[underlying] = price;
    }
}
