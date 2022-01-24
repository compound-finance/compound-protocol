pragma solidity 0.5.17;

import "./CToken.sol";

contract RewardsDistributorDelegatorStorage {
    /// @notice Administrator for this contract
    address public admin;

    /// @notice Pending administrator for this contract
    address public pendingAdmin;

    /// @notice Active brains of RewardsDistributor
    address public implementation;
}

/**
 * @title Storage for RewardsDistributorDelegate
 * @notice For future upgrades, do not change RewardsDistributorDelegateStorageV1. Create a new
 * contract which implements RewardsDistributorDelegateStorageV1 and following the naming convention
 * RewardsDistributorDelegateStorageVX.
 */
contract RewardsDistributorDelegateStorageV1 is RewardsDistributorDelegatorStorage {
    /// @dev The token to reward (i.e., COMP)
    address public rewardToken;

    struct CompMarketState {
        /// @notice The market's last updated compBorrowIndex or compSupplyIndex
        uint224 index;

        /// @notice The block number the index was last updated at
        uint32 block;
    }

    /// @notice A list of all markets
    CToken[] public allMarkets;

    /// @notice Rewards per block that each market currently receives
    mapping(address => uint) public compSupplySpeeds;

    /// @notice Rewards per block that each market currently receives
    mapping(address => uint) public compBorrowSpeeds;

    /// @notice The COMP market supply state for each market
    mapping(address => CompMarketState) public compSupplyState;

    /// @notice The COMP market borrow state for each market
    mapping(address => CompMarketState) public compBorrowState;

    /// @notice The COMP borrow index for each market for each supplier as of the last time they accrued COMP
    mapping(address => mapping(address => uint)) public compSupplierIndex;

    /// @notice The COMP borrow index for each market for each borrower as of the last time they accrued COMP
    mapping(address => mapping(address => uint)) public compBorrowerIndex;

    /// @notice The COMP accrued but not yet transferred to each user
    mapping(address => uint) public compAccrued;

    /// @notice The portion of COMP that each contributor receives per block
    mapping(address => uint) public compContributorSpeeds;

    /// @notice Last block at which a contributor's COMP rewards have been allocated
    mapping(address => uint) public lastContributorBlock;
}
