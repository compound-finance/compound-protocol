pragma solidity ^0.5.16;

import "./AggregatorInterface.sol";
import "./PriceOracle.sol";
import "./ErrorReporter.sol";
import "./SafeMath.sol";

contract ChainlinkPriceOracle is PriceOracle, OracleErrorReporter {
    using SafeMath for uint;

    //// @notice Administrator for this contract
    address public admin;

    //// @notice Mapping of (cToken Address => price feed AggregatorInterface)
    mapping(address => AggregatorInterface) public priceFeeds;

    //// @notice Emitted when a price feed is set
    event PriceFeedSet(address indexed cTokenAddress, address indexed oldPriceFeed, address indexed newPriceFeed);

    constructor() public {
        admin = msg.sender;
    }

    /**
     * @notice Get the underlying price of a cToken asset
     * @param cToken The cToken to get the underlying price of
     * @return The underlying asset price
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        // Check that a price feed exists for the cToken
        AggregatorInterface feed = priceFeeds[address(cToken)];
        require(address(feed) != address(0), "Price feed doesn't exist");

        // Get the price
        int price = feed.latestAnswer();
        require(price >= 0, "Price cannot be negative");
        return uint(price);
    }

    /*** Admin Functions ***/

    /**
     * @notice Add a price feed for a cToken
     * @param cTokenAddress The address of the cToken
     * @param newPriceFeedAddress The address of the price feed
     * @return Whether or not the price feed was set
     */
    function _setPriceFeed(address cTokenAddress, address newPriceFeedAddress) external returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PRICE_FEED_OWNER_CHECK);
        }

        // Get the old feed
        address oldPriceFeedAddress = address(priceFeeds[cTokenAddress]);

        // Set new feed
        priceFeeds[cTokenAddress] = AggregatorInterface(newPriceFeedAddress);

        // Emit that a price feed has been added
        emit PriceFeedSet(cTokenAddress, oldPriceFeedAddress, newPriceFeedAddress);

        return uint(Error.NO_ERROR);
    }
}
