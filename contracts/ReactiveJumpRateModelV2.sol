pragma solidity 0.5.17;

import "./BaseJumpRateModelV2.sol";
import "./InterestRateModel.sol";
import "./CToken.sol";


/**
  * @title Compound's JumpRateModel Contract V2 for V2 cTokens
  * @author Arr00
  * @notice Supports only for V2 cTokens
  */
contract ReactiveJumpRateModelV2 is InterestRateModel, BaseJumpRateModelV2 {
    /**
     * @notice CToken to react to
     */
    CToken public cToken;

    /**
     * @notice Buffer size of interest checkpoints
     */
    uint constant internal INTEREST_CHECKPOINT_BUFFER = 16;
    
    /**
     * @notice Number of interest checkpoints
     */
    uint internal interestCheckpointCount;

    /**
     * @notice Struct for interest checkpoints
     */
    struct InterestCheckpoint {
        uint blockNumber;
        uint borrowIndex;
        uint borrowRateMantissa;
    }

    /**
     * @notice Array of interest checkpoints
     */
    InterestCheckpoint[] internal interestCheckpoints;

    /**
     * @notice Calculates the current borrow rate per block
     * @param cash The amount of cash in the market
     * @param borrows The amount of borrows in the market
     * @param reserves The amount of reserves in the market
     * @return The borrow rate percentage per block as a mantissa (scaled by 1e18)
     */
    function getBorrowRate(uint cash, uint borrows, uint reserves) external view returns (uint) {
        return getBorrowRateInternal(cash, borrows, reserves);
    }

    constructor (uint baseRatePerYear, uint multiplierPerYear, uint jumpMultiplierPerYear, uint kink_, address owner_, address cToken_) 
        BaseJumpRateModelV2(baseRatePerYear, multiplierPerYear, jumpMultiplierPerYear, kink_, owner_) public {
        cToken = CToken(cToken_);
    }

    /**
     * @dev Checkpoints the current borrow index and adjusts parameters based on the average borrow rate calculated from past checkpoints.
     */
    function checkpointInterest() external {
        checkpointInterest(cToken.borrowRatePerBlock());
    }

    /**
     * @dev Checkpoints the current borrow index and adjusts parameters based on the average borrow rate calculated from past checkpoints.
     */
    function checkpointInterest(uint borrowRateMantissa) public {
        // Make sure the sender is the cToken
        require(msg.sender == address(cToken));

        // Get cToken variables
        uint accrualBlockNumber = cToken.accrualBlockNumber();
        uint borrowIndex = cToken.borrowIndex();

        // Add latest interest checkpoint
        InterestCheckpoint memory checkpointNow = InterestCheckpoint(accrualBlockNumber, borrowIndex, borrowRateMantissa);

        // Check if the two latest checkpoints were within the last day
        if (interestCheckpointCount >= 2 && interestCheckpoints[(interestCheckpointCount - 2) % INTEREST_CHECKPOINT_BUFFER].blockNumber >= accrualBlockNumber.sub(6500)) {
            // If yes, overwrite the last checkpoint
            interestCheckpoints[(interestCheckpointCount - 1) % INTEREST_CHECKPOINT_BUFFER] = checkpointNow;
        } else {
            // If not, add a fresh checkpoint
            interestCheckpoints[interestCheckpointCount % INTEREST_CHECKPOINT_BUFFER] = checkpointNow;
            interestCheckpointCount++;

            // Make sure earliest checkpoint is at least 6 days old
            uint256 blockNumberSixDaysAgo = accrualBlockNumber.sub(6500 * 6);
            if (interestCheckpoints[interestCheckpointCount > INTEREST_CHECKPOINT_BUFFER ? interestCheckpointCount % INTEREST_CHECKPOINT_BUFFER : 0].blockNumber > blockNumberSixDaysAgo) return;

            // Check interest checkpoints (assuming earliest checkpoint is at least 6 days old)
            InterestCheckpoint memory interestCheckpoint;
            bool checkpointNotOld = false;
            uint256 i;

            // Start looping from the oldest checkpoint
            for (i = interestCheckpointCount > INTEREST_CHECKPOINT_BUFFER ? interestCheckpointCount - INTEREST_CHECKPOINT_BUFFER : 0; i < interestCheckpointCount; i++) {
                interestCheckpoint = interestCheckpoints[i % INTEREST_CHECKPOINT_BUFFER];

                // If we can find a checkpoint within 1 day of a week ago (i.e., 6 to 8 days ago), use it
                if (interestCheckpoint.blockNumber >= accrualBlockNumber.sub(6500 * 8) && interestCheckpoint.blockNumber <= blockNumberSixDaysAgo) {
                    checkpointNotOld = true;
                    break;
                }

                // If we have looped too far (newer than 6 days ago), break so we use the previous (old) checkpoint
                if (interestCheckpoint.blockNumber > blockNumberSixDaysAgo) break;
            }

            // If previous checkpoint is old (because either the loop ended or we broke the loop), find the interest rate at 7 days (using the previous checkpoint, which must be at least 8 days old given the above conditions)
            if (!checkpointNotOld) {
                interestCheckpoint = interestCheckpoints[(i - 1) % INTEREST_CHECKPOINT_BUFFER];
                uint blockNumberOneWeekAgo = accrualBlockNumber.sub(6500 * 7);
                uint blockDelta = blockNumberOneWeekAgo.sub(interestCheckpoint.blockNumber);
                uint simpleInterestFactor = interestCheckpoint.borrowRateMantissa.mul(blockDelta);
                interestCheckpoint = InterestCheckpoint(blockNumberOneWeekAgo, borrowIndex.add(borrowIndex.mul(simpleInterestFactor).div(1e18)), interestCheckpoint.borrowRateMantissa);
            }

            // Get average borrow rate per block over the last (roughly) one week
            uint avgBorrowRateLastWeek = borrowIndex.mul(1e18).div(interestCheckpoint.borrowIndex).sub(1e18);
            uint avgBorrowRatePerBlock = avgBorrowRateLastWeek.div(accrualBlockNumber.sub(interestCheckpoint.blockNumber));

            // Get ideal JumpRateModel multiplierPerBlock param
            uint idealMultiplierPerBlock = avgBorrowRatePerBlock < baseRatePerBlock ? 0 : avgBorrowRatePerBlock.sub(baseRatePerBlock).mul(1e18).div(kink.sub(0.05e18));

            // Only reset params if idealMultiplierPerBlock differs from currentMultiplierPerBlock by >= 5%
            uint256 ratio = idealMultiplierPerBlock.mul(1e18).div(multiplierPerBlock);

            if (ratio <= 0.95e18 || ratio >= 1.05e18) {
                // Set JumpRateModelV2 params (multiplying per-block values to per-year)
                updateJumpRateModelInternal(
                    baseRatePerBlock.mul(blocksPerYear),
                    idealMultiplierPerBlock.mul(blocksPerYear.mul(kink)).div(1e18), // Note that the JumpRateModelV2 computes multiplierPerBlock from muliplierPerYear differently than the JumpRateModel
                    jumpMultiplierPerBlock.mul(blocksPerYear),
                    kink
                );
            }
        }
    }

    /**
     * @dev Resets the interest checkpoint count to 0.
     */
    function resetInterestCheckpoints() external {
        // Make sure the sender is the cToken
        require(msg.sender == address(cToken));

        // Reset checkpoint count to 0
        interestCheckpointCount = 0;
    }
}
