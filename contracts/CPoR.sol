pragma solidity ^0.5.16;

import "./CErc20Delegate.sol";
import "./AggregatorV3Interface.sol";

/**
 * @title Compound's CPoR (Proof of Reserves) Contract
 * @notice CToken which checks reserves before minting
 * @author Chainlink
 */
contract CPoR is CErc20Delegate, CPoRInterface {
    /**
     * @notice User supplies assets into the market and receives cTokens in exchange
     * @dev Overrides CErc20's mintFresh function to check the proof of reserves
     * @dev This check can be skipped if the feed is set to the zero address
     * @param account The address of the account which is supplying the assets
     * @param mintAmount The amount of the underlying asset to supply
     * @return (uint, uint) An error code (0=success, otherwise a failure, see ErrorReporter.sol), and the actual mint amount.
     */
    function mintFresh(address account, uint mintAmount) internal returns (uint, uint) {
        if (feed == address(0)) {
            return super.mintFresh(account, mintAmount);
        }

        MathError mathErr;
        // Get the latest details from the feed
        (,int answer,,uint updatedAt,) = AggregatorV3Interface(feed).latestRoundData();

        uint oldestAllowed;
        // Use MAX_AGE if heartbeat is not explicitly set
        (mathErr, oldestAllowed) = subUInt(block.timestamp, heartbeat == 0 ? MAX_AGE : heartbeat);
        if (mathErr != MathError.NO_ERROR) {
            return (fail(Error.MATH_ERROR, FailureInfo.MINT_FEED_INVALID_TIMESTAMP), 0);
        }

        // Check that the feed's answer is updated with the heartbeat
        if (oldestAllowed > updatedAt) {
            return (fail(Error.TOKEN_MINT_ERROR, FailureInfo.MINT_FEED_HEARTBEAT_CHECK), 0);
        }

        // Get required info
        uint underlyingSupply = EIP20Interface(underlying).totalSupply();
        uint8 underlyingDecimals = EIP20Interface(underlying).decimals();
        uint8 feedDecimals = AggregatorV3Interface(feed).decimals();
        uint answerUint = uint(answer);

        // Check that the feed and underlying token decimals are equivalent and normalize if not
        if (underlyingDecimals < feedDecimals) {
            (mathErr, underlyingSupply) = mulUInt(underlyingSupply, 10 ** uint(feedDecimals - underlyingDecimals));
        } else if (feedDecimals < underlyingDecimals) {
            (mathErr, answerUint) = mulUInt(answerUint, 10 ** uint(underlyingDecimals - feedDecimals));
        }

        if (mathErr != MathError.NO_ERROR) {
            return (fail(Error.MATH_ERROR, FailureInfo.MINT_FEED_INVALID_DECIMALS), 0);
        }

        // Check that the supply of underlying tokens is not greater than the proof of reserves
        if (underlyingSupply > answerUint) {
            return (fail(Error.TOKEN_MINT_ERROR, FailureInfo.MINT_FEED_SUPPLY_CHECK), 0);
        }

        return super.mintFresh(account, mintAmount);
    }

    /*** Admin Functions ***/

    /**
     * @notice Sets a new feed address
     * @dev Admin function to set a new feed
     * @param newFeed Address of the new feed
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _setFeed(address newFeed) external returns (uint) {
        // Check caller = admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_FEED_ADMIN_OWNER_CHECK);
        }

        emit NewFeed(feed, newFeed);

        feed = newFeed;

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Sets the feed's heartbeat expectation
     * @dev Admin function to set the heartbeat
     * @param newHeartbeat Value of the age of the latest update from the feed
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _setHeartbeat(uint newHeartbeat) external returns (uint) {
        // Check caller = admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_FEED_HEARTBEAT_ADMIN_OWNER_CHECK);
        }

        // Check newHeartbeat input
        if (newHeartbeat > MAX_AGE) {
            return fail(Error.BAD_INPUT, FailureInfo.SET_FEED_HEARTBEAT_INPUT_CHECK);
        }

        emit NewHeartbeat(heartbeat, newHeartbeat);

        heartbeat = newHeartbeat;

        return uint(Error.NO_ERROR);
    }
}
