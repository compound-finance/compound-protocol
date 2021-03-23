pragma solidity ^0.5.16;

import "./AggregatorInterface.sol";
import "./PriceOracle.sol";
import "./ErrorReporter.sol";
import "./SafeMath.sol";

contract ChainlinkPriceOracle is PriceOracle, OracleErrorReporter {
    using SafeMath for uint;

    struct AggregatorDetails {
        AggregatorInterface feed;
        uint8 decimals;
    }

    /// @notice Administrator for this contract. Full control of contract.
    address public admin;

    /// @notice Failover administrator for this contract. Failover control only.
    address public failoverAdmin;

    /// @notice Mapping of (cToken Address => price feed AggregatorInterface)
    mapping(address => AggregatorDetails) public priceFeeds;

    /// @notice Failover price feeds to switch to in emergency
    mapping(address => AggregatorDetails) public failoverFeeds;

    /// @notice Emitted when a new administrator is set
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    /// @notice Emitted when a new failover admin is set
    event FailoverAdminChanged(address indexed oldFailoverAdmin, address indexed newFailoverAdmin);

    /// @notice Emitted when a price feed is set
    event PriceFeedSet(address indexed cTokenAddress, address indexed newPriceFeed, address indexed failoverPriceFeed);

    /// @notice Emitted when a cToken price feed is failed over
    event PriceFeedFailover(address indexed cTokenAddress, address indexed oldPriceFeed, address indexed failoverPriceFeed);

    /**
     * @notice Create a new ChainlinkPriceOracle
     * @dev msg.sender is used as the full admin. failoverAdminAddress is used as the failoverAdmin
     * @param failoverAdminAddress failover admin
     */
    constructor(address failoverAdminAddress) public {
        admin = msg.sender;
        failoverAdmin = failoverAdminAddress;
    }

    /**
     * @notice Get the underlying price of a cToken asset
     * @param cToken The cToken to get the underlying price of
     * @return The underlying asset price
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        // Check that a price feed exists for the cToken
        AggregatorDetails memory feedDetails = priceFeeds[address(cToken)];
        require(address(feedDetails.feed) != address(0), "Price feed doesn't exist");

        // Get the price
        int price = feedDetails.feed.latestAnswer();
        require(price >= 0, "Price cannot be negative");

        return uint(price).mul(uint(10)**feedDetails.decimals);
    }

    /*** Admin Only Functions ***/

    /**
     * @notice Set a new admin for this contract
     * @dev Only the current admin can call this function.
     * @dev We eschew the safe ownership transfer pattern (i.e. a two step transfer using proposeAdmin, acceptAdmin)
     * since this role will be held by a governance contract whose voters can reasonably be expected to thoroughly
     * verify any new admin prior to voting.
     * @param newAdmin The new administrator address
     * @return Success code uint
     */
    function _setAdmin(address newAdmin) external returns (uint) {
        address currentAdmin = admin;

        // Check caller is admin
        if (msg.sender != currentAdmin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_ADMIN_OWNER_CHECK);
        }

        // Check if new admin is different to old
        if (newAdmin == currentAdmin) {
            return fail(Error.BAD_INPUT, FailureInfo.SET_ADMIN_NO_CHANGE);
        }

        // Set new admin
        admin = newAdmin;

        emit AdminChanged(currentAdmin, newAdmin);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Set a new failover admin for this contract
     * @dev Only the admin can call this function
     * @param newFailoverAdmin The new failvover admin address
     * @return Success code uint
     */
    function _setFailoverAdmin(address newFailoverAdmin) external returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_FAILOVER_ADMIN_OWNER_CHECK);
        }

        address currentFailoverAdmin = failoverAdmin;

        // Check if new failover admin is different to old
        if (newFailoverAdmin == currentFailoverAdmin) {
            return fail(Error.BAD_INPUT, FailureInfo.SET_FAILOVER_ADMIN_NO_CHANGE);
        }

        // Set new admin
        failoverAdmin = newFailoverAdmin;

        emit FailoverAdminChanged(currentFailoverAdmin, newFailoverAdmin);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Add a price feed for a cToken
     * @dev Only callable by the administrator
     * @param cTokenAddress The address of the cToken
     * @param newPriceFeedAddress The address of the price feed
     * @param newPriceFeedExtraDecimals The extra decimals required for the new price feed to conform to 18 decimals
     * @param failoverPriceFeedAddress The failover address
     * @param failoverPriceFeedExtraDecimals The extra decimals required for the failover feed to conform to 18 decimals
     * @return Whether or not the price feed was set
     */
    function _setPriceFeed(address cTokenAddress,
                            address newPriceFeedAddress,
                            uint8 newPriceFeedExtraDecimals,
                            address failoverPriceFeedAddress,
                            uint8 failoverPriceFeedExtraDecimals) external returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PRICE_FEED_OWNER_CHECK);
        }

        // Check that neither of the price feed addresses are zero addresses
        if (newPriceFeedAddress == address(0) || failoverPriceFeedAddress == address(0)) {
            return fail(Error.BAD_INPUT, FailureInfo.SET_PRICE_FEED_ZERO_ADDRESS);
        }

        // Check that the failover price feed address is different to the price feed address
        if (newPriceFeedAddress == failoverPriceFeedAddress) {
            return fail(Error.BAD_INPUT, FailureInfo.SET_PRICE_FEED_INVALID_FAILOVER);
        }

        // Set new feed
        priceFeeds[cTokenAddress] = AggregatorDetails({
            feed: AggregatorInterface(newPriceFeedAddress),
            decimals: newPriceFeedExtraDecimals
        });

        // Set failover feed
        failoverFeeds[cTokenAddress] = AggregatorDetails({
            feed: AggregatorInterface(failoverPriceFeedAddress),
            decimals: failoverPriceFeedExtraDecimals
        });

        // Emit that a price feed has been added
        emit PriceFeedSet(cTokenAddress, newPriceFeedAddress, failoverPriceFeedAddress);

        return uint(Error.NO_ERROR);
    }

    /*** Admin or Failover Admin Only Functions ***/

    /**
     * @notice Failover cToken price feed
     * @dev Only callable by the administrator, or the failover administrator
     * @param cTokenAddress cToken to failover price feed
     * @return Whether or not the price feed failed over
     */
    function _failoverPriceFeed(address cTokenAddress) external returns (uint) {
        // Check that caller is admin or failover admin
        if (msg.sender != admin && msg.sender != failoverAdmin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.FAILOVER_PRICE_FEED_OWNER_CHECK);
        }

        // Current price feed
        AggregatorInterface oldPriceFeed = priceFeeds[cTokenAddress].feed;

        // Failover price feed
        AggregatorDetails memory failoverDetails = failoverFeeds[cTokenAddress];
        AggregatorInterface failoverPriceFeed = failoverDetails.feed;

        // Check if already failed over
        if (address(oldPriceFeed) == address(failoverPriceFeed)) {
            return fail(Error.CANNOT_FAILOVER, FailureInfo.ALREADY_FAILED_OVER);
        }

        // Set the cToken to use the failover price feed
        priceFeeds[cTokenAddress] = failoverDetails;

        // Emit that a cToken price feed has failed over
        emit PriceFeedFailover(cTokenAddress, address(oldPriceFeed), address(failoverPriceFeed));

        return uint(Error.NO_ERROR);
    }
}
