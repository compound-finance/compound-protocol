pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./CToken.sol";
import "./CErc20.sol";
import "./interfaces/IChainlinkAggregator.sol";
import "./EIP20Interface.sol";
import "./ExponentialNoError.sol";

contract PriceOracleProxy is PriceOracle, ExponentialNoError {
    struct ExchangeRateInfo {
        bool isSet;
        /// @notice The base token
        address base;
        /// @notice The exchange rate
        uint256 exchangeRate;
    }

    /// @notice Indicator that this is a PriceOracle contract (for inspection)
    bool public constant isPriceOracle = true;

    /// @notice admin can add price aggregators
    address public admin;

    /// @notice chainlink price aggregator for each underlying assets
    mapping(address => IChainlinkAggregator) public aggregators;

    /// @notice exchange rate for each underlying assets
    mapping(address => ExchangeRateInfo) public exchangeRates;

    constructor(address admin_) public {
        admin = admin_;
    }

    /**
     * @notice Get the price of a specific token.
     * @param token The token to get the price of
     * @return The price
     */
    function getTokenPrice(address token) public view returns (uint256) {
        if (exchangeRates[token].isSet) {
            return getPriceUsingExchangeRate(token);
        }

        return getPriceFromChainlink(token);
    }

    /**
      * @notice Get the underlying price of a cToken asset
      * @param cToken The cToken to get the underlying price of
      * @return The underlying asset price mantissa (scaled by 1e18).
      *  Zero means the price is unavailable.
      */
    function getUnderlyingPrice(CToken cToken) public view returns (uint256) {
        address cTokenAddress = address(cToken);

        address underlying = CErc20(cTokenAddress).underlying();

        uint256 price = getTokenPrice(underlying);
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

    function getPriceUsingExchangeRate(address underlying) internal view returns (uint256) {
        ExchangeRateInfo memory exchangeRate = exchangeRates[underlying];

        uint256 basePrice;

        if (exchangeRate.base == address(0)) {
            basePrice = 1e18;
        } else {
            basePrice = getTokenPrice(exchangeRate.base);
        }

        return mul_(basePrice, exchangeRate.exchangeRate) / 1e18;
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
     * @param base The underlying token to set the price of
     * @param exchangeRate The price of the token
     */
    function _setExchangeRate(address underlying, address base, uint256 exchangeRate) external {
        require(msg.sender == admin, "Only admin can set exchange rate");

        exchangeRates[underlying] = ExchangeRateInfo({isSet: true, base: base, exchangeRate: exchangeRate});
    }
}
