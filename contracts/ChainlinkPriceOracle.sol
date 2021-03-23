pragma solidity ^0.5.16;

import "./AggregatorInterface.sol";
import "./PriceOracle.sol";
import "./SafeMath.sol";

contract ChainlinkPriceOracle is PriceOracle {
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
     * @return New admin address
     */
    function _setAdmin(address newAdmin) external returns (address) {
        address currentAdmin = admin;
        // Check caller is admin
        require(msg.sender == currentAdmin, "Must be admin");

        // Check if new admin is different to old
        require(newAdmin != currentAdmin, "Addresses are equal");

        // Set new admin
        admin = newAdmin;

        emit AdminChanged(currentAdmin, newAdmin);

        return admin;
    }

    /**
     * @notice Set a new failover admin for this contract
     * @dev Only the admin can call this function
     * @param newFailoverAdmin The new failvover admin address
     * @return New admin address
     */
    function _setFailoverAdmin(address newFailoverAdmin) external returns (address) {
        // Check caller is admin
        require(msg.sender == admin, "Must be admin");

        address currentFailoverAdmin = failoverAdmin;

        // Check that new failover admin is different to current
        require(newFailoverAdmin != currentFailoverAdmin, "Addresses are equal");

        // Set new admin
        failoverAdmin = newFailoverAdmin;

        emit FailoverAdminChanged(currentFailoverAdmin, newFailoverAdmin);

        return failoverAdmin;
    }

    /**
     * @notice Add a price feed for a cToken
     * @dev Only callable by the administrator
     * @param cTokenAddress The address of the cToken
     * @param newPriceFeedAddress The address of the price feed
     * @param newPriceFeedExtraDecimals The extra decimals required for the new price feed to conform to 18 decimals
     * @param failoverPriceFeedAddress The failover address
     * @param failoverPriceFeedExtraDecimals The extra decimals required for the failover feed to conform to 18 decimals
     */
    function _setPriceFeed(address cTokenAddress,
                            address newPriceFeedAddress,
                            uint8 newPriceFeedExtraDecimals,
                            address failoverPriceFeedAddress,
                            uint8 failoverPriceFeedExtraDecimals) external {
        // Check caller is admin
        require(msg.sender == admin, "Must be admin");

        // Check that neither of the price feed addresses are zero addresses
        require(newPriceFeedAddress != address(0) && failoverPriceFeedAddress != address(0), "Cannot be zero address");

        // Check that the extra decimals do not exceed 18
        require(newPriceFeedExtraDecimals <= 18 && failoverPriceFeedExtraDecimals <= 18, "Max 18 extra decimals");

        // Check that the failover price feed address is different to the price feed address
        require(newPriceFeedAddress != failoverPriceFeedAddress, "Failover must differ from main");

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
    }

    /*** Admin or Failover Admin Only Functions ***/

    /**
     * @notice Failover cToken price feed
     * @dev Only callable by the administrator, or the failover administrator
     * @param cTokenAddress cToken to failover price feed
     */
    function _failoverPriceFeed(address cTokenAddress) public {
        // Check caller is admin or failover admin
        require(msg.sender == admin || msg.sender == failoverAdmin, "Must be admin or failover admin");

        // Current price feed
        AggregatorInterface oldPriceFeed = priceFeeds[cTokenAddress].feed;

        // Failover price feed
        AggregatorDetails memory failoverDetails = failoverFeeds[cTokenAddress];
        AggregatorInterface failoverPriceFeed = failoverDetails.feed;

        // Check if already failed over
        require(address(oldPriceFeed) != address(failoverPriceFeed), "Already failed over");

        // Set the cToken to use the failover price feed
        priceFeeds[cTokenAddress] = failoverDetails;

        // Emit that a cToken price feed has failed over
        emit PriceFeedFailover(cTokenAddress, address(oldPriceFeed), address(failoverPriceFeed));
    }

    /**
     * @notice Failover multiple price feeds at once
     * @dev Only callable by the administrator, or the failover administrator
     * @param cTokenAddresses cTokens to failover
     */
    function _failoverPriceFeeds(address[] calldata cTokenAddresses) external {
        for (uint256 i = 0; i < cTokenAddresses.length; i++) {
            _failoverPriceFeed(cTokenAddresses[i]);
        }
    }
}
