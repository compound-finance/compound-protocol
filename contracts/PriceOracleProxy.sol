pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./CTokenInterface.sol";
import "./CErc20.sol";
import "./interfaces/IChainlinkAggregator.sol";
import "./EIP20Interface.sol";
import "./ExponentialNoError.sol";

contract PriceOracleProxy is PriceOracle, ExponentialNoError {
    enum OracleType {
        NONE,
        CHAINLINK,
        FIXED
    }

    struct TokenInfo {
        uint8 decimals;

        OracleType oracleType;
    }

    struct ChainlinkInfo {
        IChainlinkAggregator aggregator;

        uint8 decimals;
    }

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

    /// @notice all other tokens are priced against the base token. Its price is 1e18
    /// @dev address(0) represent usd
    address public baseTokenAddress;

    /// @notice tokens managed by the oracle
    mapping(address => TokenInfo) public tokens;

    /// @notice chainlink price aggregator for each underlying assets
    mapping(address => ChainlinkInfo) public chainlinkAggregators;

    /// @notice exchange rate for each underlying assets
    mapping(address => ExchangeRateInfo) public exchangeRates;

    constructor(address admin_, address baseTokenAddress_) public {
        admin = admin_;
        baseTokenAddress = baseTokenAddress_;
    }

    /**
     * @notice Get the price of a specific token.
     * @param token The token to get the price of
     * @return The price
     */
    function getTokenPrice(address token) public view returns (uint256) {
        if (token == baseTokenAddress) {
            return 1e18;
        }

        TokenInfo memory tokenInfo = tokens[token];

        if (tokenInfo.oracleType == OracleType.CHAINLINK) {
            return getPriceFromChainlink(token);
        } else if (tokenInfo.oracleType == OracleType.FIXED) {
            return getPriceUsingExchangeRate(token);
        }

        revert("Token not registered");
    }

    /**
      * @notice Get the underlying price of a cToken asset
      * @param cToken The cToken to get the underlying price of
      * @return The underlying asset price mantissa (scaled by 1e18).
      *  Zero means the price is unavailable.
      */
    function getUnderlyingPrice(CTokenInterface cToken) public view returns (uint256) {
        address cTokenAddress = address(cToken);

        address underlying = CErc20(cTokenAddress).underlying();

        uint256 price = getTokenPrice(underlying);
        uint256 underlyingDecimals = EIP20Interface(underlying).decimals();

        return underlyingDecimals <= 18 ? mul_(price, 10**(18 - underlyingDecimals)) : div_(price, 10**(underlyingDecimals - 18));
    }

    /**
     * @notice Get price from ChainLink
     * @param underlying The underlying token that ChainLink aggregator gets the price of
     * @return The price, scaled by 1e18
     */
    function getPriceFromChainlink(address underlying) internal view returns (uint256) {
        ChainlinkInfo memory chainlink = chainlinkAggregators[underlying];

        (, int256 price, , , ) = chainlink.aggregator.latestRoundData();
        require(price > 0, "invalid price");

        // Extend the decimals to 1e18.
        return mul_(uint256(price), 10**(18 - uint256(chainlink.decimals)));
    }

    /**
     * @notice Get fixed exchange rate for token
     * @param token The token the price will be given
     * @return The price, scaled by 1e18
     */
    function getPriceUsingExchangeRate(address token) internal view returns (uint256) {
        ExchangeRateInfo memory exchangeRate = exchangeRates[token];

        uint256 basePrice = getTokenPrice(exchangeRate.base);

        return div_(mul_(basePrice, exchangeRate.exchangeRate), 1e18);
    }

    function setTokenInfo(address token, OracleType oracleType) internal {
        tokens[token] = TokenInfo({
            decimals: EIP20Interface(token).decimals(),
            oracleType: oracleType
        });
    }

    /**
     * @notice Set Chainlink aggregator
     * @param token The token that ChainLink aggregator gets the price of
     * @param aggregator The Chainlink aggregator to get the price from
     */
    function _setAggregator(address token, IChainlinkAggregator aggregator) external {
        require(msg.sender == admin, "Only admin can add aggregator");

        setTokenInfo(token, OracleType.CHAINLINK);
        chainlinkAggregators[token] = ChainlinkInfo({
            aggregator: aggregator,
            decimals: aggregator.decimals()
        });
    }

    /**
     * @notice Set fixed price
     * @param token The token to set the price of
     * @param base The token that is priced against
     * @param exchangeRate The price of the token
     */
    function _setExchangeRate(address token, address base, uint256 exchangeRate) external {
        require(msg.sender == admin, "Only admin can set exchange rate");

        setTokenInfo(token, OracleType.FIXED);
        exchangeRates[token] = ExchangeRateInfo({isSet: true, base: base, exchangeRate: exchangeRate});
    }
}
