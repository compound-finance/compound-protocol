pragma solidity ^0.5.16;

import "./CToken.sol";
import "./ExponentialNoError.sol";
import "./Comptroller.sol";
import "./RewardsDistributorStorage.sol";

/**
 * @title RewardsDistributorDelegate (COMP distribution logic extracted from `Comptroller`)
 * @author Compound
 */
contract RewardsDistributorDelegate is RewardsDistributorDelegateStorageV1, ExponentialNoError {
    /// @dev Notice that this contract is a RewardsDistributor
    bool public constant isRewardsDistributor = true;

    /// @notice Emitted when pendingAdmin is changed
    event NewPendingAdmin(address oldPendingAdmin, address newPendingAdmin);

    /// @notice Emitted when pendingAdmin is accepted, which means admin is updated
    event NewAdmin(address oldAdmin, address newAdmin);

    /// @notice Emitted when a new COMP speed is calculated for a market
    event CompSupplySpeedUpdated(CToken indexed cToken, uint newSpeed);

    /// @notice Emitted when a new COMP speed is calculated for a market
    event CompBorrowSpeedUpdated(CToken indexed cToken, uint newSpeed);

    /// @notice Emitted when a new COMP speed is set for a contributor
    event ContributorCompSpeedUpdated(address indexed contributor, uint newSpeed);

    /// @notice Emitted when COMP is distributed to a supplier
    event DistributedSupplierComp(CToken indexed cToken, address indexed supplier, uint compDelta, uint compSupplyIndex);

    /// @notice Emitted when COMP is distributed to a borrower
    event DistributedBorrowerComp(CToken indexed cToken, address indexed borrower, uint compDelta, uint compBorrowIndex);

    /// @notice Emitted when COMP is granted by admin
    event CompGranted(address recipient, uint amount);

    /// @notice The initial COMP index for a market
    uint224 public constant compInitialIndex = 1e36;

    /// @dev Intitializer to set admin to caller and set reward token
    function initialize(address _rewardToken) external {
        require(msg.sender == admin, "Only admin can initialize.");
        require(rewardToken == address(0), "Already initialized.");
        require(_rewardToken != address(0), "Cannot initialize reward token to the zero address.");
        rewardToken = _rewardToken;
    }

    /*** Set Admin ***/

    /**
      * @notice Begins transfer of admin rights. The newPendingAdmin must call `_acceptAdmin` to finalize the transfer.
      * @dev Admin function to begin change of admin. The newPendingAdmin must call `_acceptAdmin` to finalize the transfer.
      * @param newPendingAdmin New pending admin.
      */
    function _setPendingAdmin(address newPendingAdmin) external {
        // Check caller = admin
        require(msg.sender == admin, "RewardsDistributor:_setPendingAdmin: admin only");

        // Save current value, if any, for inclusion in log
        address oldPendingAdmin = pendingAdmin;

        // Store pendingAdmin with value newPendingAdmin
        pendingAdmin = newPendingAdmin;

        // Emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin)
        emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin);
    }

    /**
      * @notice Accepts transfer of admin rights. msg.sender must be pendingAdmin
      * @dev Admin function for pending admin to accept role and update admin
      */
    function _acceptAdmin() external {
        // Check caller is pendingAdmin and pendingAdmin ≠ address(0)
        require(msg.sender == pendingAdmin && msg.sender != address(0), "RewardsDistributor:_acceptAdmin: pending admin only");

        // Save current values for inclusion in log
        address oldAdmin = admin;
        address oldPendingAdmin = pendingAdmin;

        // Store admin with value pendingAdmin
        admin = pendingAdmin;

        // Clear the pending value
        pendingAdmin = address(0);

        emit NewAdmin(oldAdmin, admin);
        emit NewPendingAdmin(oldPendingAdmin, pendingAdmin);
    }

    /*** Comp Distribution ***/

    /**
     * @notice Check the cToken before adding
     * @param cToken The market to add
     */
    function checkCToken(CToken cToken) internal view {
        // Make sure cToken is listed
        Comptroller comptroller = Comptroller(address(cToken.comptroller()));
        (bool isListed, ) = comptroller.markets(address(cToken));
        require(isListed == true, "comp market is not listed");

        // Make sure distributor is added
        bool distributorAdded = false;
        address[] memory distributors = comptroller.getRewardsDistributors();
        for (uint256 i = 0; i < distributors.length; i++) if (distributors[i] == address(this)) distributorAdded = true; 
        require(distributorAdded == true, "distributor not added");
    }

    /**
     * @notice Set COMP speed for a single market
     * @param cToken The market whose COMP speed to update
     * @param compSpeed New COMP speed for market
     */
    function setCompSupplySpeedInternal(CToken cToken, uint compSpeed) internal {
        uint currentCompSpeed = compSupplySpeeds[address(cToken)];
        if (currentCompSpeed != 0) {
            // note that COMP speed could be set to 0 to halt liquidity rewards for a market
            updateCompSupplyIndex(address(cToken));
        } else if (compSpeed != 0) {
            // Make sure cToken is listed and distributor is added
            checkCToken(cToken);

            // Add the COMP market
            if (compSupplyState[address(cToken)].index == 0) {
                compSupplyState[address(cToken)] = CompMarketState({
                    index: compInitialIndex,
                    block: safe32(getBlockNumber(), "block number exceeds 32 bits")
                });

                // Add to allMarkets array if not already there
                if (compBorrowState[address(cToken)].index == 0) {
                    allMarkets.push(cToken);
                }
            } else {
                // Update block number to ensure extra interest is not accrued during the prior period
                compSupplyState[address(cToken)].block = safe32(getBlockNumber(), "block number exceeds 32 bits");
            }
        }

        if (currentCompSpeed != compSpeed) {
            compSupplySpeeds[address(cToken)] = compSpeed;
            emit CompSupplySpeedUpdated(cToken, compSpeed);
        }
    }

    /**
     * @notice Set COMP speed for a single market
     * @param cToken The market whose COMP speed to update
     * @param compSpeed New COMP speed for market
     */
    function setCompBorrowSpeedInternal(CToken cToken, uint compSpeed) internal {
        uint currentCompSpeed = compBorrowSpeeds[address(cToken)];
        if (currentCompSpeed != 0) {
            // note that COMP speed could be set to 0 to halt liquidity rewards for a market
            Exp memory borrowIndex = Exp({mantissa: cToken.borrowIndex()});
            updateCompBorrowIndex(address(cToken), borrowIndex);
        } else if (compSpeed != 0) {
            // Make sure cToken is listed and distributor is added
            checkCToken(cToken);

            // Add the COMP market
            if (compBorrowState[address(cToken)].index == 0) {
                compBorrowState[address(cToken)] = CompMarketState({
                    index: compInitialIndex,
                    block: safe32(getBlockNumber(), "block number exceeds 32 bits")
                });

                // Add to allMarkets array if not already there
                if (compSupplyState[address(cToken)].index == 0) {
                    allMarkets.push(cToken);
                }
            } else {
                // Update block number to ensure extra interest is not accrued during the prior period
                compBorrowState[address(cToken)].block = safe32(getBlockNumber(), "block number exceeds 32 bits");
            }
        }

        if (currentCompSpeed != compSpeed) {
            compBorrowSpeeds[address(cToken)] = compSpeed;
            emit CompBorrowSpeedUpdated(cToken, compSpeed);
        }
    }

    /**
     * @notice Accrue COMP to the market by updating the supply index
     * @param cToken The market whose supply index to update
     */
    function updateCompSupplyIndex(address cToken) internal {
        CompMarketState storage supplyState = compSupplyState[cToken];
        uint supplySpeed = compSupplySpeeds[cToken];
        uint blockNumber = getBlockNumber();
        uint deltaBlocks = sub_(blockNumber, uint(supplyState.block));
        if (deltaBlocks > 0 && supplySpeed > 0) {
            uint supplyTokens = CToken(cToken).totalSupply();
            uint compAccrued_ = mul_(deltaBlocks, supplySpeed);
            Double memory ratio = supplyTokens > 0 ? fraction(compAccrued_, supplyTokens) : Double({mantissa: 0});
            Double memory index = add_(Double({mantissa: supplyState.index}), ratio);
            compSupplyState[cToken] = CompMarketState({
                index: safe224(index.mantissa, "new index exceeds 224 bits"),
                block: safe32(blockNumber, "block number exceeds 32 bits")
            });
        } else if (deltaBlocks > 0 && supplyState.index > 0) {
            supplyState.block = safe32(blockNumber, "block number exceeds 32 bits");
        }
    }

    /**
     * @notice Accrue COMP to the market by updating the borrow index
     * @param cToken The market whose borrow index to update
     */
    function updateCompBorrowIndex(address cToken, Exp memory marketBorrowIndex) internal {
        CompMarketState storage borrowState = compBorrowState[cToken];
        uint borrowSpeed = compBorrowSpeeds[cToken];
        uint blockNumber = getBlockNumber();
        uint deltaBlocks = sub_(blockNumber, uint(borrowState.block));
        if (deltaBlocks > 0 && borrowSpeed > 0) {
            uint borrowAmount = div_(CToken(cToken).totalBorrows(), marketBorrowIndex);
            uint compAccrued_ = mul_(deltaBlocks, borrowSpeed);
            Double memory ratio = borrowAmount > 0 ? fraction(compAccrued_, borrowAmount) : Double({mantissa: 0});
            Double memory index = add_(Double({mantissa: borrowState.index}), ratio);
            compBorrowState[cToken] = CompMarketState({
                index: safe224(index.mantissa, "new index exceeds 224 bits"),
                block: safe32(blockNumber, "block number exceeds 32 bits")
            });
        } else if (deltaBlocks > 0 && borrowState.index > 0) {
            borrowState.block = safe32(blockNumber, "block number exceeds 32 bits");
        }
    }

    /**
     * @notice Calculate COMP accrued by a supplier and possibly transfer it to them
     * @param cToken The market in which the supplier is interacting
     * @param supplier The address of the supplier to distribute COMP to
     */
    function distributeSupplierComp(address cToken, address supplier) internal {
        CompMarketState storage supplyState = compSupplyState[cToken];
        Double memory supplyIndex = Double({mantissa: supplyState.index});
        Double memory supplierIndex = Double({mantissa: compSupplierIndex[cToken][supplier]});
        compSupplierIndex[cToken][supplier] = supplyIndex.mantissa;

        if (supplierIndex.mantissa == 0 && supplyIndex.mantissa > 0) {
            supplierIndex.mantissa = compInitialIndex;
        }

        Double memory deltaIndex = sub_(supplyIndex, supplierIndex);
        uint supplierTokens = CToken(cToken).balanceOf(supplier);
        uint supplierDelta = mul_(supplierTokens, deltaIndex);
        uint supplierAccrued = add_(compAccrued[supplier], supplierDelta);
        compAccrued[supplier] = supplierAccrued;
        emit DistributedSupplierComp(CToken(cToken), supplier, supplierDelta, supplyIndex.mantissa);
    }

    /**
     * @notice Calculate COMP accrued by a borrower and possibly transfer it to them
     * @dev Borrowers will not begin to accrue until after the first interaction with the protocol.
     * @param cToken The market in which the borrower is interacting
     * @param borrower The address of the borrower to distribute COMP to
     */
    function distributeBorrowerComp(address cToken, address borrower, Exp memory marketBorrowIndex) internal {
        CompMarketState storage borrowState = compBorrowState[cToken];
        Double memory borrowIndex = Double({mantissa: borrowState.index});
        Double memory borrowerIndex = Double({mantissa: compBorrowerIndex[cToken][borrower]});
        compBorrowerIndex[cToken][borrower] = borrowIndex.mantissa;

        if (borrowerIndex.mantissa > 0) {
            Double memory deltaIndex = sub_(borrowIndex, borrowerIndex);
            uint borrowerAmount = div_(CToken(cToken).borrowBalanceStored(borrower), marketBorrowIndex);
            uint borrowerDelta = mul_(borrowerAmount, deltaIndex);
            uint borrowerAccrued = add_(compAccrued[borrower], borrowerDelta);
            compAccrued[borrower] = borrowerAccrued;
            emit DistributedBorrowerComp(CToken(cToken), borrower, borrowerDelta, borrowIndex.mantissa);
        }
    }

    /**
     * @notice Keeps the flywheel moving pre-mint and pre-redeem
     * @dev Called by the Comptroller
     * @param cToken The relevant market
     * @param supplier The minter/redeemer
     */
    function flywheelPreSupplierAction(address cToken, address supplier) external {
        if (compSupplyState[cToken].index > 0) {
            updateCompSupplyIndex(cToken);
            distributeSupplierComp(cToken, supplier);
        }
    }

    /**
     * @notice Keeps the flywheel moving pre-borrow and pre-repay
     * @dev Called by the Comptroller
     * @param cToken The relevant market
     * @param borrower The borrower
     */
    function flywheelPreBorrowerAction(address cToken, address borrower) external {
        if (compBorrowState[cToken].index > 0) {
            Exp memory borrowIndex = Exp({mantissa: CToken(cToken).borrowIndex()});
            updateCompBorrowIndex(cToken, borrowIndex);
            distributeBorrowerComp(cToken, borrower, borrowIndex);
        }
    }

    /**
     * @notice Keeps the flywheel moving pre-transfer and pre-seize
     * @dev Called by the Comptroller
     * @param cToken The relevant market
     * @param src The account which sources the tokens
     * @param dst The account which receives the tokens
     */
    function flywheelPreTransferAction(address cToken, address src, address dst) external {
        if (compSupplyState[cToken].index > 0) {
            updateCompSupplyIndex(cToken);
            distributeSupplierComp(cToken, src);
            distributeSupplierComp(cToken, dst);
        }
    }

    /**
     * @notice Calculate additional accrued COMP for a contributor since last accrual
     * @param contributor The address to calculate contributor rewards for
     */
    function updateContributorRewards(address contributor) public {
        uint compSpeed = compContributorSpeeds[contributor];
        uint blockNumber = getBlockNumber();
        uint deltaBlocks = sub_(blockNumber, lastContributorBlock[contributor]);
        if (deltaBlocks > 0 && compSpeed > 0) {
            uint newAccrued = mul_(deltaBlocks, compSpeed);
            uint contributorAccrued = add_(compAccrued[contributor], newAccrued);

            compAccrued[contributor] = contributorAccrued;
            lastContributorBlock[contributor] = blockNumber;
        }
    }

    /**
     * @notice Claim all the comp accrued by holder in all markets
     * @param holder The address to claim COMP for
     */
    function claimRewards(address holder) public {
        return claimRewards(holder, allMarkets);
    }

    /**
     * @notice Claim all the comp accrued by holder in the specified markets
     * @param holder The address to claim COMP for
     * @param cTokens The list of markets to claim COMP in
     */
    function claimRewards(address holder, CToken[] memory cTokens) public {
        address[] memory holders = new address[](1);
        holders[0] = holder;
        claimRewards(holders, cTokens, true, true);
    }

    /**
     * @notice Claim all comp accrued by the holders
     * @param holders The addresses to claim COMP for
     * @param cTokens The list of markets to claim COMP in
     * @param borrowers Whether or not to claim COMP earned by borrowing
     * @param suppliers Whether or not to claim COMP earned by supplying
     */
    function claimRewards(address[] memory holders, CToken[] memory cTokens, bool borrowers, bool suppliers) public {
        for (uint i = 0; i < cTokens.length; i++) {
            CToken cToken = cTokens[i];
            if (borrowers == true && compBorrowState[address(cToken)].index > 0) {
                Exp memory borrowIndex = Exp({mantissa: cToken.borrowIndex()});
                updateCompBorrowIndex(address(cToken), borrowIndex);
                for (uint j = 0; j < holders.length; j++) {
                    distributeBorrowerComp(address(cToken), holders[j], borrowIndex);
                }
            }
            if (suppliers == true && compSupplyState[address(cToken)].index > 0) {
                updateCompSupplyIndex(address(cToken));
                for (uint j = 0; j < holders.length; j++) {
                    distributeSupplierComp(address(cToken), holders[j]);
                }
            }
        }
        for (uint j = 0; j < holders.length; j++) {
            compAccrued[holders[j]] = grantCompInternal(holders[j], compAccrued[holders[j]]);
        }
    }

    /**
     * @notice Transfer COMP to the user
     * @dev Note: If there is not enough COMP, we do not perform the transfer all.
     * @param user The address of the user to transfer COMP to
     * @param amount The amount of COMP to (possibly) transfer
     * @return The amount of COMP which was NOT transferred to the user
     */
    function grantCompInternal(address user, uint amount) internal returns (uint) {
        EIP20NonStandardInterface comp = EIP20NonStandardInterface(rewardToken);
        uint compRemaining = comp.balanceOf(address(this));
        if (amount > 0 && amount <= compRemaining) {
            comp.transfer(user, amount);
            return 0;
        }
        return amount;
    }

    /*** Comp Distribution Admin ***/

    /**
     * @notice Transfer COMP to the recipient
     * @dev Note: If there is not enough COMP, we do not perform the transfer all.
     * @param recipient The address of the recipient to transfer COMP to
     * @param amount The amount of COMP to (possibly) transfer
     */
    function _grantComp(address recipient, uint amount) public {
        require(msg.sender == admin, "only admin can grant comp");
        uint amountLeft = grantCompInternal(recipient, amount);
        require(amountLeft == 0, "insufficient comp for grant");
        emit CompGranted(recipient, amount);
    }

    /**
     * @notice Set COMP speed for a single market
     * @param cToken The market whose COMP speed to update
     * @param compSpeed New COMP speed for market
     */
    function _setCompSupplySpeed(CToken cToken, uint compSpeed) public {
        require(msg.sender == admin, "only admin can set comp speed");
        setCompSupplySpeedInternal(cToken, compSpeed);
    }

    /**
     * @notice Set COMP speed for a single market
     * @param cToken The market whose COMP speed to update
     * @param compSpeed New COMP speed for market
     */
    function _setCompBorrowSpeed(CToken cToken, uint compSpeed) public {
        require(msg.sender == admin, "only admin can set comp speed");
        setCompBorrowSpeedInternal(cToken, compSpeed);
    }

    /**
     * @notice Set COMP borrow and supply speeds for the specified markets.
     * @param cTokens The markets whose COMP speed to update.
     * @param supplySpeeds New supply-side COMP speed for the corresponding market.
     * @param borrowSpeeds New borrow-side COMP speed for the corresponding market.
     */
    function _setCompSpeeds(CToken[] memory cTokens, uint[] memory supplySpeeds, uint[] memory borrowSpeeds) public {
        require(msg.sender == admin, "only admin can set comp speed");

        uint numTokens = cTokens.length;
        require(numTokens == supplySpeeds.length && numTokens == borrowSpeeds.length, "RewardsDistributor::_setCompSpeeds invalid input");

        for (uint i = 0; i < numTokens; ++i) {
            setCompSupplySpeedInternal(cTokens[i], supplySpeeds[i]);
            setCompBorrowSpeedInternal(cTokens[i], borrowSpeeds[i]);
        }
    }

    /**
     * @notice Set COMP speed for a single contributor
     * @param contributor The contributor whose COMP speed to update
     * @param compSpeed New COMP speed for contributor
     */
    function _setContributorCompSpeed(address contributor, uint compSpeed) public {
        require(msg.sender == admin, "only admin can set comp speed");

        // note that COMP speed could be set to 0 to halt liquidity rewards for a contributor
        updateContributorRewards(contributor);
        if (compSpeed == 0) {
            // release storage
            delete lastContributorBlock[contributor];
        } else {
            lastContributorBlock[contributor] = getBlockNumber();
        }
        compContributorSpeeds[contributor] = compSpeed;

        emit ContributorCompSpeedUpdated(contributor, compSpeed);
    }

    /*** Helper Functions */

    function getBlockNumber() public view returns (uint) {
        return block.number;
    }

    /**
     * @notice Returns an array of all markets.
     */
    function getAllMarkets() external view returns (CToken[] memory) {
        return allMarkets;
    }
}
