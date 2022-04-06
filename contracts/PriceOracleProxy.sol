pragma solidity ^0.5.16;

import './libraries/UniswapLib.sol';

import "./PriceOracle.sol";
import "./CTokenInterface.sol";
import "./CErc20.sol";
import "./interfaces/IChainlinkAggregator.sol";
import "./EIP20Interface.sol";
import "./ExponentialNoError.sol";

contract PriceOracleProxy is PriceOracle, ExponentialNoError {
    /// @notice The event emitted when the stored price is updated
    event PriceUpdated(address underlying, address base, uint price);

    /// @notice The event emitted when the uniswap window changes
    event UniswapWindowUpdated(address indexed underlying, uint oldTimestamp, uint newTimestamp, uint oldPrice, uint newPrice);

    /// @notice The event emitted when anchor price is updated
    event AnchorPriceUpdated(address underlying, uint anchorPrice, uint oldTimestamp, uint newTimestamp);

    enum OracleType {
        NONE,
        CHAINLINK,
        FIXED,
        TWAP
    }

    struct TokenInfo {
        OracleType oracleType;
    }

    struct ChainlinkInfo {
        IChainlinkAggregator aggregator;

        uint8 decimals;
    }

    struct ExchangeRateInfo {
        /// @notice The base token
        address base;
        /// @notice The exchange rate
        uint256 exchangeRate;
    }

    struct UniswapTWAPInfo {
        /// @notice The base token
        address base;

        /// @notice The liquidity pair managing the tokens
        address uniswapPair;

        /// @notice Is true if token0 on the pair is the token
        bool isUniswapReversed;

        /// @notice Decimals of token
        uint8 tokenDecimals;

        /// @notice Decimals of base
        uint8 baseDecimals;
    }

    struct UniswapTWAPObservation {
        /// @notice Uniswap cummulative price at a certain time
        uint256 cumulativePrice;

        /// @notice The time the observation was taken
        uint256 timestamp;
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

    /// @notice Uniswap information for each underlying assets
    mapping(address => UniswapTWAPInfo) public uniswapTWAPs;

    /// @notice Uniswap TWAP price observation older than 30 mins
    mapping(address => mapping(address => UniswapTWAPObservation)) public oldTWAPObservations;

    /// @notice Uniswap TWAP price observation in the last 30 mins
    mapping(address => mapping(address => UniswapTWAPObservation)) public newTWAPObservations;

    /// @notice The minimum amount of time in seconds required for the old uniswap price accumulator to be replaced
    uint constant uniswapAnchorPeriod = 1800;

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
        } else if (tokenInfo.oracleType == OracleType.FIXED || tokenInfo.oracleType == OracleType.TWAP) {
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
        exchangeRates[token] = ExchangeRateInfo({ base: base, exchangeRate: exchangeRate});
        emit PriceUpdated(token, base, exchangeRate);
    }

    /**
     * @notice Set Uniswap TWAP
     * @param token The token to set the price of
     * @param base The token it will be priced against
     * @param pair The uniswap pair to monitor
     */
    function _setUniswapTWAP(address token, address base, address pair) external {
        require(msg.sender == admin, "Only admin can set Uniswap TWAP");

        address token0 = IUniswapV2Pair(pair).token0();
        address token1 = IUniswapV2Pair(pair).token1();
        bool isUniswapReversed = token1 == token;

        require(isUniswapReversed ? token0 == base : token1 == base, "Invalid base for LP token");
        require(isUniswapReversed ? token1 == token : token0 == token, "Invalid token for LP token");

        setTokenInfo(token, OracleType.TWAP);
        uniswapTWAPs[token] = UniswapTWAPInfo({
            base: base,
            uniswapPair: pair,
            isUniswapReversed: isUniswapReversed,
            tokenDecimals: EIP20Interface(token).decimals(),
            baseDecimals: EIP20Interface(base).decimals()
        });

        uint timestamp = getBlockTimestamp();
        uint cumulativePrice = currentCumulativePrice(uniswapTWAPs[token]);
        oldTWAPObservations[token][base].timestamp = timestamp;
        newTWAPObservations[token][base].timestamp = timestamp;
        oldTWAPObservations[token][base].cumulativePrice = cumulativePrice;
        newTWAPObservations[token][base].cumulativePrice = cumulativePrice;
        emit UniswapWindowUpdated(token, timestamp, timestamp, cumulativePrice, cumulativePrice);

        exchangeRates[token] = ExchangeRateInfo({
            base: base,
            exchangeRate: 0
        });
    }

    /**
     * @notice Update Uniswap TWAP prices
     * @dev We let anyone pay to post anything, but only prices from Uniswap will be stored in the view.
     * @param underlyings The underlying token addresses for which to get and post TWAPs
     */
    function updateUniswapPrices(address[] calldata underlyings) external {
        // Try to update the view storage
        for (uint i = 0; i < underlyings.length; i++) {
            updateUniswapPriceInternal(underlyings[i]);
        }
    }

    function updateUniswapPriceInternal(address token) internal {
        require(tokens[token].oracleType == OracleType.TWAP, "only TWAP prices get posted");
        UniswapTWAPInfo memory config = uniswapTWAPs[token];
        uint anchorPrice = fetchAnchorPrice(token, config);
        exchangeRates[token].exchangeRate = anchorPrice;
        emit PriceUpdated(token, config.base, anchorPrice);
    }

    /**
     * @dev Fetches the current token/ETH price from Uniswap, with 18 decimals of precision.
     */
    function fetchAnchorPrice(address underlying, UniswapTWAPInfo memory config) internal returns (uint) {
        (uint nowCumulativePrice, uint oldCumulativePrice, uint oldTimestamp) = pokeWindowValues(underlying, config);

        uint timestamp = getBlockTimestamp();

        // This should be impossible, but better safe than sorry
        require(timestamp > oldTimestamp, "now must come after before");
        uint timeElapsed = timestamp - oldTimestamp;

        // Calculate uniswap time-weighted average price
        // Underflow is a property of the accumulators: https://uniswap.org/audit.html#orgc9b3190
        FixedPoint.uq112x112 memory priceAverage = FixedPoint.uq112x112(uint224((nowCumulativePrice - oldCumulativePrice) / timeElapsed));
        uint rawUniswapPriceMantissa = FixedPoint.decode112with18(priceAverage);
        uint unscaledPriceMantissa = mul_(rawUniswapPriceMantissa, 1e18);
        uint anchorPrice;

        // Adjust rawUniswapPrice according to the units of the non-ETH asset

        // In the case of non-ETH tokens
        // a. pokeWindowValues already handled uniswap reversed cases, so priceAverage will always be Token/ETH TWAP price.
        // b. conversionFactor = 1e18
        // unscaledPriceMantissa = priceAverage(token/ETH TWAP price) * expScale * conversionFactor
        // so ->
        // anchorPrice = priceAverage * tokenBaseUnit / ethBaseUnit * 1e18
        //             = priceAverage * conversionFactor * tokenBaseUnit / ethBaseUnit
        //             = unscaledPriceMantissa / expScale * tokenBaseUnit / ethBaseUnit
        anchorPrice = mul_(unscaledPriceMantissa, (10 ** uint256(config.tokenDecimals))) / (10 ** uint256(config.baseDecimals)) / 1e18;

        emit AnchorPriceUpdated(underlying, anchorPrice, oldTimestamp, timestamp);

        return anchorPrice;
    }

    /**
     * @dev Get time-weighted average prices for a token at the current timestamp.
     *  Update new and old observations of lagging window if period elapsed.
     */
    function pokeWindowValues(address underlying, UniswapTWAPInfo memory config) internal returns (uint, uint, uint) {
        address base = config.base;
        uint cumulativePrice = currentCumulativePrice(config);

        UniswapTWAPObservation memory newObservation = newTWAPObservations[underlying][base];

        uint timestamp = getBlockTimestamp();

        // Update new and old observations if elapsed time is greater than or equal to anchor period
        uint timeElapsed = timestamp - newObservation.timestamp;
        if (timeElapsed >= uniswapAnchorPeriod) {
            oldTWAPObservations[underlying][base].timestamp = newObservation.timestamp;
            oldTWAPObservations[underlying][base].cumulativePrice = newObservation.cumulativePrice;

            newTWAPObservations[underlying][base].timestamp = timestamp;
            newTWAPObservations[underlying][base].cumulativePrice = cumulativePrice;
            emit UniswapWindowUpdated(underlying, newObservation.timestamp, timestamp, newObservation.cumulativePrice, cumulativePrice);
        }
        return (cumulativePrice, oldTWAPObservations[underlying][base].cumulativePrice, oldTWAPObservations[underlying][base].timestamp);
    }

    /**
     * @dev Fetches the current token/eth price accumulator from uniswap.
     */
    function currentCumulativePrice(UniswapTWAPInfo memory config) internal view returns (uint) {
        (uint cumulativePrice0, uint cumulativePrice1,) = UniswapV2OracleLibrary.currentCumulativePrices(
            config.uniswapPair,
            getBlockTimestamp()
        );
        if (config.isUniswapReversed) {
            return cumulativePrice1;
        } else {
            return cumulativePrice0;
        }
    }

    function getBlockTimestamp() public view returns (uint) {
        return block.timestamp;
    }
}
