pragma solidity ^0.5.16;

import "./VToken.sol";
import "./PriceOracle.sol";

contract UnitrollerAdminStorage {
    /**
    * @notice Administrator for this contract
    */
    address public admin;

    /**
    * @notice Pending administrator for this contract
    */
    address public pendingAdmin;

    /**
    * @notice Active brains of Unitroller
    */
    address public controllerImplementation;

    /**
    * @notice Pending brains of Unitroller
    */
    address public pendingControllerImplementation;
}

contract ControllerV1Storage is UnitrollerAdminStorage {

    /**
     * @notice Oracle which gives the price of any given asset
     */
    PriceOracle public oracle;

    /**
     * @notice Multiplier used to calculate the maximum repayAmount when liquidating a borrow
     */
    uint public closeFactorMantissa;

    /**
     * @notice Multiplier representing the discount on collateral that a liquidator receives
     */
    uint public liquidationIncentiveMantissa;

    /**
     * @notice Max number of assets a single account can participate in (borrow or use as collateral)
     */
    uint public maxAssets;

    /**
     * @notice Per-account mapping of "assets you are in", capped by maxAssets
     */
    mapping(address => VToken[]) public accountAssets;

}

contract ControllerV2Storage is ControllerV1Storage {
    struct Market {
        /// @notice Whether or not this market is listed
        bool isListed;

        /**
         * @notice Multiplier representing the most one can borrow against their collateral in this market.
         *  For instance, 0.9 to allow borrowing 90% of collateral value.
         *  Must be between 0 and 1, and stored as a mantissa.
         */
        uint collateralFactorMantissa;

        /// @notice Per-market mapping of "accounts in this asset"
        mapping(address => bool) accountMembership;

        /// @notice Whether or not this market receives VTX
        bool isVtxed;
    }

    /**
     * @notice Official mapping of vTokens -> Market metadata
     * @dev Used e.g. to determine if a market is supported
     */
    mapping(address => Market) public markets;


    /**
     * @notice The Pause Guardian can pause certain actions as a safety mechanism.
     *  Actions which allow users to remove their own assets cannot be paused.
     *  Liquidation / seizing / transfer can only be paused globally, not by market.
     */
    address public pauseGuardian;
    bool public _mintGuardianPaused;
    bool public _borrowGuardianPaused;
    bool public transferGuardianPaused;
    bool public seizeGuardianPaused;
    mapping(address => bool) public mintGuardianPaused;
    mapping(address => bool) public borrowGuardianPaused;
}

contract ControllerV3Storage is ControllerV2Storage {
    struct VtxMarketState {
        /// @notice The market's last updated vtxBorrowIndex or vtxSupplyIndex
        uint224 index;

        /// @notice The block number the index was last updated at
        uint32 block;
    }

    /// @notice A list of all markets
    VToken[] public allMarkets;

    /// @notice The rate at which the flywheel distributes VTX, per block
    uint public vtxRate;

    /// @notice The portion of vtxRate that each market currently receives
    mapping(address => uint) public vtxSpeeds;

    /// @notice The VTX market supply state for each market
    mapping(address => VtxMarketState) public vtxSupplyState;

    /// @notice The VTX market borrow state for each market
    mapping(address => VtxMarketState) public vtxBorrowState;

    /// @notice The VTX borrow index for each market for each supplier as of the last time they accrued VTX
    mapping(address => mapping(address => uint)) public vtxSupplierIndex;

    /// @notice The VTX borrow index for each market for each borrower as of the last time they accrued VTX
    mapping(address => mapping(address => uint)) public vtxBorrowerIndex;

    /// @notice The VTX accrued but not yet transferred to each user
    mapping(address => uint) public vtxAccrued;
}

contract ControllerV4Storage is ControllerV3Storage {
    // @notice The borrowCapGuardian can set borrowCaps to any number for any market. Lowering the borrow cap could disable borrowing on the given market.
    address public borrowCapGuardian;

    // @notice Borrow caps enforced by borrowAllowed for each vToken address. Defaults to zero which corresponds to unlimited borrowing.
    mapping(address => uint) public borrowCaps;
}

contract ControllerV5Storage is ControllerV4Storage {
    /// @notice The portion of VTX that each contributor receives per block
    mapping(address => uint) public vtxContributorSpeeds;

    /// @notice Last block at which a contributor's VTX rewards have been allocated
    mapping(address => uint) public lastContributorBlock;
}
