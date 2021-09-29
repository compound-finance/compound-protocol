pragma solidity ^0.5.16;

import "./CToken.sol";
import "./CErc20.sol";
import "./ErrorReporter.sol";
import "./Exponential.sol";
import "./PriceOracle.sol";
import "./ComptrollerInterface.sol";
import "./ComptrollerStorage.sol";
import "./Unitroller.sol";
import "./RewardsDistributorDelegate.sol";

/**
 * @title Compound's Comptroller Contract
 * @author Compound
 * @dev This contract should not to be deployed alone; instead, deploy `Unitroller` (proxy contract) on top of this `Comptroller` (logic/implementation contract).
 */
contract Comptroller is ComptrollerV3Storage, ComptrollerInterface, ComptrollerErrorReporter, Exponential {
    /// @notice Emitted when an admin supports a market
    event MarketListed(CToken cToken);

    /// @notice Emitted when an admin unsupports a market
    event MarketUnlisted(CToken cToken);

    /// @notice Emitted when an account enters a market
    event MarketEntered(CToken cToken, address account);

    /// @notice Emitted when an account exits a market
    event MarketExited(CToken cToken, address account);

    /// @notice Emitted when close factor is changed by admin
    event NewCloseFactor(uint oldCloseFactorMantissa, uint newCloseFactorMantissa);

    /// @notice Emitted when a collateral factor is changed by admin
    event NewCollateralFactor(CToken cToken, uint oldCollateralFactorMantissa, uint newCollateralFactorMantissa);

    /// @notice Emitted when liquidation incentive is changed by admin
    event NewLiquidationIncentive(uint oldLiquidationIncentiveMantissa, uint newLiquidationIncentiveMantissa);

    /// @notice Emitted when price oracle is changed
    event NewPriceOracle(PriceOracle oldPriceOracle, PriceOracle newPriceOracle);

    /// @notice Emitted when pause guardian is changed
    event NewPauseGuardian(address oldPauseGuardian, address newPauseGuardian);

    /// @notice Emitted when an action is paused globally
    event ActionPaused(string action, bool pauseState);

    /// @notice Emitted when an action is paused on a market
    event ActionPaused(CToken cToken, string action, bool pauseState);

    /// @notice Emitted when the whitelist enforcement is changed
    event WhitelistEnforcementChanged(bool enforce);

    /// @notice Emitted when auto implementations are toggled
    event AutoImplementationsToggled(bool enabled);

    /// @notice Emitted when supply cap for a cToken is changed
    event NewSupplyCap(CToken indexed cToken, uint newSupplyCap);

    /// @notice Emitted when borrow cap for a cToken is changed
    event NewBorrowCap(CToken indexed cToken, uint newBorrowCap);

    /// @notice Emitted when borrow cap guardian is changed
    event NewBorrowCapGuardian(address oldBorrowCapGuardian, address newBorrowCapGuardian);

    /// @notice Emitted when a new RewardsDistributor contract is added to hooks
    event AddedRewardsDistributor(address rewardsDistributor);

    // closeFactorMantissa must be strictly greater than this value
    uint internal constant closeFactorMinMantissa = 0.05e18; // 0.05

    // closeFactorMantissa must not exceed this value
    uint internal constant closeFactorMaxMantissa = 0.9e18; // 0.9

    // No collateralFactorMantissa may exceed this value
    uint internal constant collateralFactorMaxMantissa = 0.9e18; // 0.9

    // liquidationIncentiveMantissa must be no less than this value
    uint internal constant liquidationIncentiveMinMantissa = 1.0e18; // 1.0

    // liquidationIncentiveMantissa must be no greater than this value
    uint internal constant liquidationIncentiveMaxMantissa = 1.5e18; // 1.5

    /*** Assets You Are In ***/

    /**
     * @notice Returns the assets an account has entered
     * @param account The address of the account to pull assets for
     * @return A dynamic list with the assets the account has entered
     */
    function getAssetsIn(address account) external view returns (CToken[] memory) {
        CToken[] memory assetsIn = accountAssets[account];

        return assetsIn;
    }

    /**
     * @notice Returns whether the given account is entered in the given asset
     * @param account The address of the account to check
     * @param cToken The cToken to check
     * @return True if the account is in the asset, otherwise false.
     */
    function checkMembership(address account, CToken cToken) external view returns (bool) {
        return markets[address(cToken)].accountMembership[account];
    }

    /**
     * @notice Add assets to be included in account liquidity calculation
     * @param cTokens The list of addresses of the cToken markets to be enabled
     * @return Success indicator for whether each corresponding market was entered
     */
    function enterMarkets(address[] memory cTokens) public returns (uint[] memory) {
        uint len = cTokens.length;

        uint[] memory results = new uint[](len);
        for (uint i = 0; i < len; i++) {
            CToken cToken = CToken(cTokens[i]);

            results[i] = uint(addToMarketInternal(cToken, msg.sender));
        }

        return results;
    }

    /**
     * @notice Add the market to the borrower's "assets in" for liquidity calculations
     * @param cToken The market to enter
     * @param borrower The address of the account to modify
     * @return Success indicator for whether the market was entered
     */
    function addToMarketInternal(CToken cToken, address borrower) internal returns (Error) {
        Market storage marketToJoin = markets[address(cToken)];

        if (!marketToJoin.isListed) {
            // market is not listed, cannot join
            return Error.MARKET_NOT_LISTED;
        }

        if (marketToJoin.accountMembership[borrower] == true) {
            // already joined
            return Error.NO_ERROR;
        }

        // survived the gauntlet, add to list
        // NOTE: we store these somewhat redundantly as a significant optimization
        //  this avoids having to iterate through the list for the most common use cases
        //  that is, only when we need to perform liquidity checks
        //  and not whenever we want to check if an account is in a particular market
        marketToJoin.accountMembership[borrower] = true;
        accountAssets[borrower].push(cToken);
        
        // Add to allBorrowers
        if (!borrowers[borrower]) {
            allBorrowers.push(borrower);
            borrowers[borrower] = true;
            borrowerIndexes[borrower] = allBorrowers.length - 1;
        }

        emit MarketEntered(cToken, borrower);

        return Error.NO_ERROR;
    }

    /**
     * @notice Removes asset from sender's account liquidity calculation
     * @dev Sender must not have an outstanding borrow balance in the asset,
     *  or be providing neccessary collateral for an outstanding borrow.
     * @param cTokenAddress The address of the asset to be removed
     * @return Whether or not the account successfully exited the market
     */
    function exitMarket(address cTokenAddress) external returns (uint) {
        CToken cToken = CToken(cTokenAddress);
        /* Get sender tokensHeld and amountOwed underlying from the cToken */
        (uint oErr, uint tokensHeld, uint amountOwed, ) = cToken.getAccountSnapshot(msg.sender);
        require(oErr == 0, "exitMarket: getAccountSnapshot failed"); // semi-opaque error code

        /* Fail if the sender has a borrow balance */
        if (amountOwed != 0) {
            return fail(Error.NONZERO_BORROW_BALANCE, FailureInfo.EXIT_MARKET_BALANCE_OWED);
        }

        /* Fail if the sender is not permitted to redeem all of their tokens */
        uint allowed = redeemAllowedInternal(cTokenAddress, msg.sender, tokensHeld);
        if (allowed != 0) {
            return failOpaque(Error.REJECTION, FailureInfo.EXIT_MARKET_REJECTION, allowed);
        }

        Market storage marketToExit = markets[address(cToken)];

        /* Return true if the sender is not already ‘in’ the market */
        if (!marketToExit.accountMembership[msg.sender]) {
            return uint(Error.NO_ERROR);
        }

        /* Set cToken account membership to false */
        delete marketToExit.accountMembership[msg.sender];

        /* Delete cToken from the account’s list of assets */
        // load into memory for faster iteration
        CToken[] memory userAssetList = accountAssets[msg.sender];
        uint len = userAssetList.length;
        uint assetIndex = len;
        for (uint i = 0; i < len; i++) {
            if (userAssetList[i] == cToken) {
                assetIndex = i;
                break;
            }
        }

        // We *must* have found the asset in the list or our redundant data structure is broken
        assert(assetIndex < len);

        // copy last item in list to location of item to be removed, reduce length by 1
        CToken[] storage storedList = accountAssets[msg.sender];
        storedList[assetIndex] = storedList[storedList.length - 1];
        storedList.length--;

        // If the user has exited all markets, remove them from the `allBorrowers` array
        if (storedList.length == 0) {
            allBorrowers[borrowerIndexes[msg.sender]] = allBorrowers[allBorrowers.length - 1]; // Copy last item in list to location of item to be removed
            allBorrowers.length--; // Reduce length by 1
            borrowerIndexes[allBorrowers[borrowerIndexes[msg.sender]]] = borrowerIndexes[msg.sender]; // Set borrower index of moved item to correct index
            borrowerIndexes[msg.sender] = 0; // Reset sender borrower index to 0 for a gas refund
            borrowers[msg.sender] = false; // Tell the contract that the sender is no longer a borrower (so it knows to add the borrower back if they enter a market in the future)
        }

        emit MarketExited(cToken, msg.sender);

        return uint(Error.NO_ERROR);
    }

    /*** Policy Hooks ***/

    /**
     * @notice Checks if the account should be allowed to mint tokens in the given market
     * @param cToken The market to verify the mint against
     * @param minter The account which would get the minted tokens
     * @param mintAmount The amount of underlying being supplied to the market in exchange for tokens
     * @return 0 if the mint is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function mintAllowed(address cToken, address minter, uint mintAmount) external returns (uint) {
        // Pausing is a very serious situation - we revert to sound the alarms
        require(!mintGuardianPaused[cToken], "mint is paused");

        // Shh - currently unused
        minter;
        mintAmount;

        // Make sure market is listed
        if (!markets[cToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }
        
        // Make sure minter is whitelisted
        if (enforceWhitelist && !whitelist[minter]) {
            return uint(Error.SUPPLIER_NOT_WHITELISTED);
        }

        // Check supply cap
        uint supplyCap = supplyCaps[cToken];
        // Supply cap of 0 corresponds to unlimited supplying
        if (supplyCap != 0) {
            uint totalCash = CToken(cToken).getCash();
            uint totalBorrows = CToken(cToken).totalBorrows();
            uint totalReserves = CToken(cToken).totalReserves();
            uint totalFuseFees = CToken(cToken).totalFuseFees();
            uint totalAdminFees = CToken(cToken).totalAdminFees();

            // totalUnderlyingSupply = totalCash + totalBorrows - (totalReserves + totalFuseFees + totalAdminFees)
            (MathError mathErr, uint totalUnderlyingSupply) = addThenSubUInt(totalCash, totalBorrows, add_(add_(totalReserves, totalFuseFees), totalAdminFees));
            if (mathErr != MathError.NO_ERROR) return uint(Error.MATH_ERROR);

            uint nextTotalUnderlyingSupply;
            (mathErr, nextTotalUnderlyingSupply) = addUInt(totalUnderlyingSupply, mintAmount);
            if (mathErr != MathError.NO_ERROR) return uint(Error.MATH_ERROR);

            require(nextTotalUnderlyingSupply < supplyCap, "market supply cap reached");
        }

        // Keep the flywheel moving
        flywheelPreSupplierAction(cToken, minter);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates mint and reverts on rejection. May emit logs.
     * @param cToken Asset being minted
     * @param minter The address minting the tokens
     * @param actualMintAmount The amount of the underlying asset being minted
     * @param mintTokens The number of tokens being minted
     */
    function mintVerify(address cToken, address minter, uint actualMintAmount, uint mintTokens) external {
        // Shh - currently unused
        cToken;
        minter;
        actualMintAmount;
        mintTokens;

        // Shh - we don't ever want this hook to be marked pure
        if (false) {
            maxAssets = maxAssets;
        }

        // Add minter to suppliers mapping
        suppliers[minter] = true;
    }

    /**
     * @notice Checks if the account should be allowed to redeem tokens in the given market
     * @param cToken The market to verify the redeem against
     * @param redeemer The account which would redeem the tokens
     * @param redeemTokens The number of cTokens to exchange for the underlying asset in the market
     * @return 0 if the redeem is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function redeemAllowed(address cToken, address redeemer, uint redeemTokens) external returns (uint) {
        uint allowed = redeemAllowedInternal(cToken, redeemer, redeemTokens);
        if (allowed != uint(Error.NO_ERROR)) {
            return allowed;
        }

        // Keep the flywheel moving
        flywheelPreSupplierAction(cToken, redeemer);

        return uint(Error.NO_ERROR);
    }

    function redeemAllowedInternal(address cToken, address redeemer, uint redeemTokens) internal view returns (uint) {
        if (!markets[cToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        /* If the redeemer is not 'in' the market, then we can bypass the liquidity check */
        if (!markets[cToken].accountMembership[redeemer]) {
            return uint(Error.NO_ERROR);
        }

        /* Otherwise, perform a hypothetical liquidity check to guard against shortfall */
        (Error err, , uint shortfall) = getHypotheticalAccountLiquidityInternal(redeemer, CToken(cToken), redeemTokens, 0);
        if (err != Error.NO_ERROR) {
            return uint(err);
        }
        if (shortfall > 0) {
            return uint(Error.INSUFFICIENT_LIQUIDITY);
        }

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates redeem and reverts on rejection. May emit logs.
     * @param cToken Asset being redeemed
     * @param redeemer The address redeeming the tokens
     * @param redeemAmount The amount of the underlying asset being redeemed
     * @param redeemTokens The number of tokens being redeemed
     */
    function redeemVerify(address cToken, address redeemer, uint redeemAmount, uint redeemTokens) external {
        // Shh - currently unused
        cToken;
        redeemer;

        // Require tokens is zero or amount is also zero
        if (redeemTokens == 0 && redeemAmount > 0) {
            revert("redeemTokens zero");
        }
    }

    /**
     * @notice Checks if the account should be allowed to borrow the underlying asset of the given market
     * @param cToken The market to verify the borrow against
     * @param borrower The account which would borrow the asset
     * @param borrowAmount The amount of underlying the account would borrow
     * @return 0 if the borrow is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function borrowAllowed(address cToken, address borrower, uint borrowAmount) external returns (uint) {
        // Pausing is a very serious situation - we revert to sound the alarms
        require(!borrowGuardianPaused[cToken], "borrow is paused");

        // Make sure market is listed
        if (!markets[cToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        if (!markets[cToken].accountMembership[borrower]) {
            // only cTokens may call borrowAllowed if borrower not in market
            require(msg.sender == cToken, "sender must be cToken");

            // attempt to add borrower to the market
            Error err = addToMarketInternal(CToken(msg.sender), borrower);
            if (err != Error.NO_ERROR) {
                return uint(err);
            }

            // it should be impossible to break the important invariant
            assert(markets[cToken].accountMembership[borrower]);
        }

        // Make sure oracle price is available
        if (oracle.getUnderlyingPrice(CToken(cToken)) == 0) {
            return uint(Error.PRICE_ERROR);
        }
        
        // Make sure borrower is whitelisted
        if (enforceWhitelist && !whitelist[borrower]) {
            return uint(Error.SUPPLIER_NOT_WHITELISTED);
        }

        // Check borrow cap
        uint borrowCap = borrowCaps[cToken];
        // Borrow cap of 0 corresponds to unlimited borrowing
        if (borrowCap != 0) {
            uint totalBorrows = CToken(cToken).totalBorrows();
            (MathError mathErr, uint nextTotalBorrows) = addUInt(totalBorrows, borrowAmount);
            if (mathErr != MathError.NO_ERROR) return uint(Error.MATH_ERROR);
            require(nextTotalBorrows < borrowCap, "market borrow cap reached");
        }

        // Keep the flywheel moving
        flywheelPreBorrowerAction(cToken, borrower);

        // Perform a hypothetical liquidity check to guard against shortfall
        (Error err, , uint shortfall) = getHypotheticalAccountLiquidityInternal(borrower, CToken(cToken), 0, borrowAmount);
        if (err != Error.NO_ERROR) {
            return uint(err);
        }
        if (shortfall > 0) {
            return uint(Error.INSUFFICIENT_LIQUIDITY);
        }

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Checks if the account should be allowed to borrow the underlying asset of the given market
     * @param cToken Asset whose underlying is being borrowed
     * @param accountBorrowsNew The user's new borrow balance of the underlying asset
     */
    function borrowWithinLimits(address cToken, uint accountBorrowsNew) external returns (uint) {
        // Check if min borrow exists
        uint minBorrowEth = fuseAdmin.minBorrowEth();

        if (minBorrowEth > 0) {
            // Get new underlying borrow balance of account for this cToken
            uint oraclePriceMantissa = oracle.getUnderlyingPrice(CToken(cToken));
            if (oraclePriceMantissa == 0) return uint(Error.PRICE_ERROR);
            (MathError mathErr, uint borrowBalanceEth) = mulScalarTruncate(Exp({mantissa: oraclePriceMantissa}), accountBorrowsNew);
            if (mathErr != MathError.NO_ERROR) return uint(Error.MATH_ERROR);

            // Check against min borrow
            if (borrowBalanceEth < minBorrowEth) return uint(Error.BORROW_BELOW_MIN);
        }

        // Return no error
        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Checks if the account should be allowed to borrow the underlying asset of the given market
     * @param cToken Asset whose underlying is being borrowed
     * @param exchangeRateMantissa Underlying/cToken exchange rate
     * @param accountTokens Initial account cToken balance
     * @param accountTokens Underlying amount to mint
     */
    function mintWithinLimits(address cToken, uint exchangeRateMantissa, uint accountTokens, uint mintAmount) external returns (uint) {
        // Return no error
        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates borrow and reverts on rejection. May emit logs.
     * @param cToken Asset whose underlying is being borrowed
     * @param borrower The address borrowing the underlying
     * @param borrowAmount The amount of the underlying asset requested to borrow
     */
    function borrowVerify(address cToken, address borrower, uint borrowAmount) external {
        // Shh - currently unused
        cToken;
        borrower;
        borrowAmount;

        // Shh - we don't ever want this hook to be marked pure
        if (false) {
            maxAssets = maxAssets;
        }
    }

    /**
     * @notice Checks if the account should be allowed to repay a borrow in the given market
     * @param cToken The market to verify the repay against
     * @param payer The account which would repay the asset
     * @param borrower The account which would borrowed the asset
     * @param repayAmount The amount of the underlying asset the account would repay
     * @return 0 if the repay is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function repayBorrowAllowed(
        address cToken,
        address payer,
        address borrower,
        uint repayAmount) external returns (uint) {
        // Shh - currently unused
        payer;
        borrower;
        repayAmount;

        // Make sure market is listed
        if (!markets[cToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        // Keep the flywheel moving
        flywheelPreBorrowerAction(cToken, borrower);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates repayBorrow and reverts on rejection. May emit logs.
     * @param cToken Asset being repaid
     * @param payer The address repaying the borrow
     * @param borrower The address of the borrower
     * @param actualRepayAmount The amount of underlying being repaid
     */
    function repayBorrowVerify(
        address cToken,
        address payer,
        address borrower,
        uint actualRepayAmount,
        uint borrowerIndex) external {
        // Shh - currently unused
        cToken;
        payer;
        borrower;
        actualRepayAmount;
        borrowerIndex;

        // Shh - we don't ever want this hook to be marked pure
        if (false) {
            maxAssets = maxAssets;
        }
    }

    /**
     * @notice Checks if the liquidation should be allowed to occur
     * @param cTokenBorrowed Asset which was borrowed by the borrower
     * @param cTokenCollateral Asset which was used as collateral and will be seized
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param repayAmount The amount of underlying being repaid
     */
    function liquidateBorrowAllowed(
        address cTokenBorrowed,
        address cTokenCollateral,
        address liquidator,
        address borrower,
        uint repayAmount) external returns (uint) {
        // Shh - currently unused
        liquidator;

        // Make sure markets are listed
        if (!markets[cTokenBorrowed].isListed || !markets[cTokenCollateral].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        // Get borrowers's underlying borrow balance
        uint borrowBalance = CToken(cTokenBorrowed).borrowBalanceStored(borrower);

        /* allow accounts to be liquidated if the market is deprecated */
        if (isDeprecated(CToken(cTokenBorrowed))) {
            require(borrowBalance >= repayAmount, "Can not repay more than the total borrow");
        } else {
            /* The borrower must have shortfall in order to be liquidatable */
            (Error err, , uint shortfall) = getAccountLiquidityInternal(borrower);
            if (err != Error.NO_ERROR) {
                return uint(err);
            }

            if (shortfall == 0) {
                return uint(Error.INSUFFICIENT_SHORTFALL);
            }

            /* The liquidator may not repay more than what is allowed by the closeFactor */
            uint maxClose = mul_ScalarTruncate(Exp({mantissa: closeFactorMantissa}), borrowBalance);
            if (repayAmount > maxClose) {
                return uint(Error.TOO_MUCH_REPAY);
            }
        }

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates liquidateBorrow and reverts on rejection. May emit logs.
     * @param cTokenBorrowed Asset which was borrowed by the borrower
     * @param cTokenCollateral Asset which was used as collateral and will be seized
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param actualRepayAmount The amount of underlying being repaid
     */
    function liquidateBorrowVerify(
        address cTokenBorrowed,
        address cTokenCollateral,
        address liquidator,
        address borrower,
        uint actualRepayAmount,
        uint seizeTokens) external {
        // Shh - currently unused
        cTokenBorrowed;
        cTokenCollateral;
        liquidator;
        borrower;
        actualRepayAmount;
        seizeTokens;

        // Shh - we don't ever want this hook to be marked pure
        if (false) {
            maxAssets = maxAssets;
        }
    }

    /**
     * @notice Checks if the seizing of assets should be allowed to occur
     * @param cTokenCollateral Asset which was used as collateral and will be seized
     * @param cTokenBorrowed Asset which was borrowed by the borrower
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param seizeTokens The number of collateral tokens to seize
     */
    function seizeAllowed(
        address cTokenCollateral,
        address cTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) external returns (uint) {
        // Pausing is a very serious situation - we revert to sound the alarms
        require(!seizeGuardianPaused, "seize is paused");

        // Shh - currently unused
        liquidator;
        borrower;
        seizeTokens;

        // Make sure markets are listed
        if (!markets[cTokenCollateral].isListed || !markets[cTokenBorrowed].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        // Make sure cToken Comptrollers are identical
        if (CToken(cTokenCollateral).comptroller() != CToken(cTokenBorrowed).comptroller()) {
            return uint(Error.COMPTROLLER_MISMATCH);
        }

        // Keep the flywheel moving
        flywheelPreTransferAction(cTokenCollateral, borrower, liquidator);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates seize and reverts on rejection. May emit logs.
     * @param cTokenCollateral Asset which was used as collateral and will be seized
     * @param cTokenBorrowed Asset which was borrowed by the borrower
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param seizeTokens The number of collateral tokens to seize
     */
    function seizeVerify(
        address cTokenCollateral,
        address cTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) external {
        // Shh - currently unused
        cTokenCollateral;
        cTokenBorrowed;
        liquidator;
        borrower;
        seizeTokens;

        // Shh - we don't ever want this hook to be marked pure
        if (false) {
            maxAssets = maxAssets;
        }
    }

    /**
     * @notice Checks if the account should be allowed to transfer tokens in the given market
     * @param cToken The market to verify the transfer against
     * @param src The account which sources the tokens
     * @param dst The account which receives the tokens
     * @param transferTokens The number of cTokens to transfer
     * @return 0 if the transfer is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function transferAllowed(address cToken, address src, address dst, uint transferTokens) external returns (uint) {
        // Pausing is a very serious situation - we revert to sound the alarms
        require(!transferGuardianPaused, "transfer is paused");

        // Currently the only consideration is whether or not
        //  the src is allowed to redeem this many tokens
        uint allowed = redeemAllowedInternal(cToken, src, transferTokens);
        if (allowed != uint(Error.NO_ERROR)) {
            return allowed;
        }

        // Keep the flywheel moving
        flywheelPreTransferAction(cToken, src, dst);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates transfer and reverts on rejection. May emit logs.
     * @param cToken Asset being transferred
     * @param src The account which sources the tokens
     * @param dst The account which receives the tokens
     * @param transferTokens The number of cTokens to transfer
     */
    function transferVerify(address cToken, address src, address dst, uint transferTokens) external {
        // Shh - currently unused
        cToken;
        src;
        dst;
        transferTokens;

        // Shh - we don't ever want this hook to be marked pure
        if (false) {
            maxAssets = maxAssets;
        }
    }

    /*** Flywheel Hooks ***/

    /**
     * @notice Keeps the flywheel moving pre-mint and pre-redeem
     * @param cToken The relevant market
     * @param supplier The minter/redeemer
     */
    function flywheelPreSupplierAction(address cToken, address supplier) internal {
        for (uint256 i = 0; i < rewardsDistributors.length; i++) RewardsDistributorDelegate(rewardsDistributors[i]).flywheelPreSupplierAction(cToken, supplier);
    }

    /**
     * @notice Keeps the flywheel moving pre-borrow and pre-repay
     * @param cToken The relevant market
     * @param borrower The borrower
     */
    function flywheelPreBorrowerAction(address cToken, address borrower) internal {
        for (uint256 i = 0; i < rewardsDistributors.length; i++) RewardsDistributorDelegate(rewardsDistributors[i]).flywheelPreBorrowerAction(cToken, borrower);
    }

    /**
     * @notice Keeps the flywheel moving pre-transfer and pre-seize
     * @param cToken The relevant market
     * @param src The account which sources the tokens
     * @param dst The account which receives the tokens
     */
    function flywheelPreTransferAction(address cToken, address src, address dst) internal {
        for (uint256 i = 0; i < rewardsDistributors.length; i++) RewardsDistributorDelegate(rewardsDistributors[i]).flywheelPreTransferAction(cToken, src, dst);
    }

    /*** Liquidity/Liquidation Calculations ***/

    /**
     * @dev Local vars for avoiding stack-depth limits in calculating account liquidity.
     *  Note that `cTokenBalance` is the number of cTokens the account owns in the market,
     *  whereas `borrowBalance` is the amount of underlying that the account has borrowed.
     */
    struct AccountLiquidityLocalVars {
        uint sumCollateral;
        uint sumBorrowPlusEffects;
        uint cTokenBalance;
        uint borrowBalance;
        uint exchangeRateMantissa;
        uint oraclePriceMantissa;
        Exp collateralFactor;
        Exp exchangeRate;
        Exp oraclePrice;
        Exp tokensToDenom;
    }

    /**
     * @notice Determine the current account liquidity wrt collateral requirements
     * @return (possible error code (semi-opaque),
                account liquidity in excess of collateral requirements,
     *          account shortfall below collateral requirements)
     */
    function getAccountLiquidity(address account) public view returns (uint, uint, uint) {
        (Error err, uint liquidity, uint shortfall) = getHypotheticalAccountLiquidityInternal(account, CToken(0), 0, 0);

        return (uint(err), liquidity, shortfall);
    }

    /**
     * @notice Determine the current account liquidity wrt collateral requirements
     * @return (possible error code,
                account liquidity in excess of collateral requirements,
     *          account shortfall below collateral requirements)
     */
    function getAccountLiquidityInternal(address account) internal view returns (Error, uint, uint) {
        return getHypotheticalAccountLiquidityInternal(account, CToken(0), 0, 0);
    }

    /**
     * @notice Determine what the account liquidity would be if the given amounts were redeemed/borrowed
     * @param cTokenModify The market to hypothetically redeem/borrow in
     * @param account The account to determine liquidity for
     * @param redeemTokens The number of tokens to hypothetically redeem
     * @param borrowAmount The amount of underlying to hypothetically borrow
     * @return (possible error code (semi-opaque),
                hypothetical account liquidity in excess of collateral requirements,
     *          hypothetical account shortfall below collateral requirements)
     */
    function getHypotheticalAccountLiquidity(
        address account,
        address cTokenModify,
        uint redeemTokens,
        uint borrowAmount) public view returns (uint, uint, uint) {
        (Error err, uint liquidity, uint shortfall) = getHypotheticalAccountLiquidityInternal(account, CToken(cTokenModify), redeemTokens, borrowAmount);
        return (uint(err), liquidity, shortfall);
    }

    /**
     * @notice Determine what the account liquidity would be if the given amounts were redeemed/borrowed
     * @param cTokenModify The market to hypothetically redeem/borrow in
     * @param account The account to determine liquidity for
     * @param redeemTokens The number of tokens to hypothetically redeem
     * @param borrowAmount The amount of underlying to hypothetically borrow
     * @dev Note that we calculate the exchangeRateStored for each collateral cToken using stored data,
     *  without calculating accumulated interest.
     * @return (possible error code,
                hypothetical account liquidity in excess of collateral requirements,
     *          hypothetical account shortfall below collateral requirements)
     */
    function getHypotheticalAccountLiquidityInternal(
        address account,
        CToken cTokenModify,
        uint redeemTokens,
        uint borrowAmount) internal view returns (Error, uint, uint) {

        AccountLiquidityLocalVars memory vars; // Holds all our calculation results
        uint oErr;

        // For each asset the account is in
        CToken[] memory assets = accountAssets[account];
        for (uint i = 0; i < assets.length; i++) {
            CToken asset = assets[i];

            // Read the balances and exchange rate from the cToken
            (oErr, vars.cTokenBalance, vars.borrowBalance, vars.exchangeRateMantissa) = asset.getAccountSnapshot(account);
            if (oErr != 0) { // semi-opaque error code, we assume NO_ERROR == 0 is invariant between upgrades
                return (Error.SNAPSHOT_ERROR, 0, 0);
            }
            vars.collateralFactor = Exp({mantissa: markets[address(asset)].collateralFactorMantissa});
            vars.exchangeRate = Exp({mantissa: vars.exchangeRateMantissa});

            // Get the normalized price of the asset
            vars.oraclePriceMantissa = oracle.getUnderlyingPrice(asset);
            if (vars.oraclePriceMantissa == 0) {
                return (Error.PRICE_ERROR, 0, 0);
            }
            vars.oraclePrice = Exp({mantissa: vars.oraclePriceMantissa});

            // Pre-compute a conversion factor from tokens -> ether (normalized price value)
            vars.tokensToDenom = mul_(mul_(vars.collateralFactor, vars.exchangeRate), vars.oraclePrice);

            // sumCollateral += tokensToDenom * cTokenBalance
            vars.sumCollateral = mul_ScalarTruncateAddUInt(vars.tokensToDenom, vars.cTokenBalance, vars.sumCollateral);

            // sumBorrowPlusEffects += oraclePrice * borrowBalance
            vars.sumBorrowPlusEffects = mul_ScalarTruncateAddUInt(vars.oraclePrice, vars.borrowBalance, vars.sumBorrowPlusEffects);

            // Calculate effects of interacting with cTokenModify
            if (asset == cTokenModify) {
                // redeem effect
                // sumBorrowPlusEffects += tokensToDenom * redeemTokens
                vars.sumBorrowPlusEffects = mul_ScalarTruncateAddUInt(vars.tokensToDenom, redeemTokens, vars.sumBorrowPlusEffects);

                // borrow effect
                // sumBorrowPlusEffects += oraclePrice * borrowAmount
                vars.sumBorrowPlusEffects = mul_ScalarTruncateAddUInt(vars.oraclePrice, borrowAmount, vars.sumBorrowPlusEffects);
            }
        }

        // These are safe, as the underflow condition is checked first
        if (vars.sumCollateral > vars.sumBorrowPlusEffects) {
            return (Error.NO_ERROR, vars.sumCollateral - vars.sumBorrowPlusEffects, 0);
        } else {
            return (Error.NO_ERROR, 0, vars.sumBorrowPlusEffects - vars.sumCollateral);
        }
    }

    /**
     * @notice Calculate number of tokens of collateral asset to seize given an underlying amount
     * @dev Used in liquidation (called in cToken.liquidateBorrowFresh)
     * @param cTokenBorrowed The address of the borrowed cToken
     * @param cTokenCollateral The address of the collateral cToken
     * @param actualRepayAmount The amount of cTokenBorrowed underlying to convert into cTokenCollateral tokens
     * @return (errorCode, number of cTokenCollateral tokens to be seized in a liquidation)
     */
    function liquidateCalculateSeizeTokens(address cTokenBorrowed, address cTokenCollateral, uint actualRepayAmount) external view returns (uint, uint) {
        /* Read oracle prices for borrowed and collateral markets */
        uint priceBorrowedMantissa = oracle.getUnderlyingPrice(CToken(cTokenBorrowed));
        uint priceCollateralMantissa = oracle.getUnderlyingPrice(CToken(cTokenCollateral));
        if (priceBorrowedMantissa == 0 || priceCollateralMantissa == 0) {
            return (uint(Error.PRICE_ERROR), 0);
        }

        /*
         * Get the exchange rate and calculate the number of collateral tokens to seize:
         *  seizeAmount = actualRepayAmount * liquidationIncentive * priceBorrowed / priceCollateral
         *  seizeTokens = seizeAmount / exchangeRate
         *   = actualRepayAmount * (liquidationIncentive * priceBorrowed) / (priceCollateral * exchangeRate)
         */
        uint exchangeRateMantissa = CToken(cTokenCollateral).exchangeRateStored(); // Note: reverts on error
        uint seizeTokens;
        Exp memory numerator;
        Exp memory denominator;
        Exp memory ratio;

        numerator = mul_(Exp({mantissa: liquidationIncentiveMantissa}), Exp({mantissa: priceBorrowedMantissa}));
        denominator = mul_(Exp({mantissa: priceCollateralMantissa}), Exp({mantissa: exchangeRateMantissa}));
        ratio = div_(numerator, denominator);

        seizeTokens = mul_ScalarTruncate(ratio, actualRepayAmount);

        return (uint(Error.NO_ERROR), seizeTokens);
    }

    /*** Admin Functions ***/

    /**
      * @notice Add a RewardsDistributor contracts.
      * @dev Admin function to add a RewardsDistributor contract
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _addRewardsDistributor(address distributor) external returns (uint) {
        // Check caller is admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.ADD_REWARDS_DISTRIBUTOR_OWNER_CHECK);
        }

        // Check marker method
        require(RewardsDistributorDelegate(distributor).isRewardsDistributor(), "marker method returned false");

        // Check for existing RewardsDistributor
        for (uint i = 0; i < rewardsDistributors.length; i++) require(distributor != rewardsDistributors[i], "RewardsDistributor contract already added");

        // Add RewardsDistributor to array
        rewardsDistributors.push(distributor);
        emit AddedRewardsDistributor(distributor);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets the whitelist enforcement for the comptroller
      * @dev Admin function to set a new whitelist enforcement boolean
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _setWhitelistEnforcement(bool enforce) external returns (uint) {
        // Check caller is admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_WHITELIST_ENFORCEMENT_OWNER_CHECK);
        }

        // Check if `enforceWhitelist` already equals `enforce`
        if (enforceWhitelist == enforce) {
            return uint(Error.NO_ERROR);
        }

        // Set comptroller's `enforceWhitelist` to `enforce`
        enforceWhitelist = enforce;

        // Emit WhitelistEnforcementChanged(bool enforce);
        emit WhitelistEnforcementChanged(enforce);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets the whitelist `statuses` for `suppliers`
      * @dev Admin function to set the whitelist `statuses` for `suppliers`
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _setWhitelistStatuses(address[] calldata suppliers, bool[] calldata statuses) external returns (uint) {
        // Check caller is admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_WHITELIST_STATUS_OWNER_CHECK);
        }

        // Set whitelist statuses for suppliers
        for (uint i = 0; i < suppliers.length; i++) {
            address supplier = suppliers[i];

            if (statuses[i]) {
                // If not already whitelisted, add to whitelist
                if (!whitelist[supplier]) {
                    whitelist[supplier] = true;
                    whitelistArray.push(supplier);
                    whitelistIndexes[supplier] = whitelistArray.length - 1;
                }
            } else {
                // If whitelisted, remove from whitelist
                if (whitelist[supplier]) {
                    whitelistArray[whitelistIndexes[supplier]] = whitelistArray[whitelistArray.length - 1]; // Copy last item in list to location of item to be removed
                    whitelistArray.length--; // Reduce length by 1
                    whitelistIndexes[whitelistArray[whitelistIndexes[supplier]]] = whitelistIndexes[supplier]; // Set whitelist index of moved item to correct index
                    whitelistIndexes[supplier] = 0; // Reset supplier whitelist index to 0 for a gas refund
                    whitelist[supplier] = false; // Tell the contract that the supplier is no longer whitelisted
                }
            }
        }

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets a new price oracle for the comptroller
      * @dev Admin function to set a new price oracle
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _setPriceOracle(PriceOracle newOracle) public returns (uint) {
        // Check caller is admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PRICE_ORACLE_OWNER_CHECK);
        }

        // Track the old oracle for the comptroller
        PriceOracle oldOracle = oracle;

        // Set comptroller's oracle to newOracle
        oracle = newOracle;

        // Emit NewPriceOracle(oldOracle, newOracle)
        emit NewPriceOracle(oldOracle, newOracle);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets the closeFactor used when liquidating borrows
      * @dev Admin function to set closeFactor
      * @param newCloseFactorMantissa New close factor, scaled by 1e18
      * @return uint 0=success, otherwise a failure. (See ErrorReporter for details)
      */
    function _setCloseFactor(uint newCloseFactorMantissa) external returns (uint256) {
        // Check caller is admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_CLOSE_FACTOR_OWNER_CHECK);
        }

        // Check limits
        Exp memory newCloseFactorExp = Exp({mantissa: newCloseFactorMantissa});
        Exp memory lowLimit = Exp({mantissa: closeFactorMinMantissa});
        if (lessThanOrEqualExp(newCloseFactorExp, lowLimit)) {
            return fail(Error.INVALID_CLOSE_FACTOR, FailureInfo.SET_CLOSE_FACTOR_VALIDATION);
        }

        Exp memory highLimit = Exp({mantissa: closeFactorMaxMantissa});
        if (lessThanExp(highLimit, newCloseFactorExp)) {
            return fail(Error.INVALID_CLOSE_FACTOR, FailureInfo.SET_CLOSE_FACTOR_VALIDATION);
        }

        // Set pool close factor to new close factor, remember old value
        uint oldCloseFactorMantissa = closeFactorMantissa;
        closeFactorMantissa = newCloseFactorMantissa;

        // Emit event
        emit NewCloseFactor(oldCloseFactorMantissa, closeFactorMantissa);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets the collateralFactor for a market
      * @dev Admin function to set per-market collateralFactor
      * @param cToken The market to set the factor on
      * @param newCollateralFactorMantissa The new collateral factor, scaled by 1e18
      * @return uint 0=success, otherwise a failure. (See ErrorReporter for details)
      */
    function _setCollateralFactor(CToken cToken, uint newCollateralFactorMantissa) public returns (uint256) {
        // Check caller is admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_COLLATERAL_FACTOR_OWNER_CHECK);
        }

        // Verify market is listed
        Market storage market = markets[address(cToken)];
        if (!market.isListed) {
            return fail(Error.MARKET_NOT_LISTED, FailureInfo.SET_COLLATERAL_FACTOR_NO_EXISTS);
        }

        Exp memory newCollateralFactorExp = Exp({mantissa: newCollateralFactorMantissa});

        // Check collateral factor <= 0.9
        Exp memory highLimit = Exp({mantissa: collateralFactorMaxMantissa});
        if (lessThanExp(highLimit, newCollateralFactorExp)) {
            return fail(Error.INVALID_COLLATERAL_FACTOR, FailureInfo.SET_COLLATERAL_FACTOR_VALIDATION);
        }

        // If collateral factor != 0, fail if price == 0
        if (newCollateralFactorMantissa != 0 && oracle.getUnderlyingPrice(cToken) == 0) {
            return fail(Error.PRICE_ERROR, FailureInfo.SET_COLLATERAL_FACTOR_WITHOUT_PRICE);
        }

        // Set market's collateral factor to new collateral factor, remember old value
        uint oldCollateralFactorMantissa = market.collateralFactorMantissa;
        market.collateralFactorMantissa = newCollateralFactorMantissa;

        // Emit event with asset, old collateral factor, and new collateral factor
        emit NewCollateralFactor(cToken, oldCollateralFactorMantissa, newCollateralFactorMantissa);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets liquidationIncentive
      * @dev Admin function to set liquidationIncentive
      * @param newLiquidationIncentiveMantissa New liquidationIncentive scaled by 1e18
      * @return uint 0=success, otherwise a failure. (See ErrorReporter for details)
      */
    function _setLiquidationIncentive(uint newLiquidationIncentiveMantissa) external returns (uint) {
        // Check caller is admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_LIQUIDATION_INCENTIVE_OWNER_CHECK);
        }

        // Check de-scaled min <= newLiquidationIncentive <= max
        Exp memory newLiquidationIncentive = Exp({mantissa: newLiquidationIncentiveMantissa});
        Exp memory minLiquidationIncentive = Exp({mantissa: liquidationIncentiveMinMantissa});
        if (lessThanExp(newLiquidationIncentive, minLiquidationIncentive)) {
            return fail(Error.INVALID_LIQUIDATION_INCENTIVE, FailureInfo.SET_LIQUIDATION_INCENTIVE_VALIDATION);
        }

        Exp memory maxLiquidationIncentive = Exp({mantissa: liquidationIncentiveMaxMantissa});
        if (lessThanExp(maxLiquidationIncentive, newLiquidationIncentive)) {
            return fail(Error.INVALID_LIQUIDATION_INCENTIVE, FailureInfo.SET_LIQUIDATION_INCENTIVE_VALIDATION);
        }

        // Save current value for use in log
        uint oldLiquidationIncentiveMantissa = liquidationIncentiveMantissa;

        // Set liquidation incentive to new incentive
        liquidationIncentiveMantissa = newLiquidationIncentiveMantissa;

        // Emit event with old incentive, new incentive
        emit NewLiquidationIncentive(oldLiquidationIncentiveMantissa, newLiquidationIncentiveMantissa);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Add the market to the markets mapping and set it as listed
      * @dev Admin function to set isListed and add support for the market
      * @param cToken The address of the market (token) to list
      * @return uint 0=success, otherwise a failure. (See enum Error for details)
      */
    function _supportMarket(CToken cToken) internal returns (uint) {
        // Check caller is admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SUPPORT_MARKET_OWNER_CHECK);
        }

        // Is market already listed?
        if (markets[address(cToken)].isListed) {
            return fail(Error.MARKET_ALREADY_LISTED, FailureInfo.SUPPORT_MARKET_EXISTS);
        }

        // Sanity check to make sure its really a CToken
        require(cToken.isCToken(), "marker method returned false");

        // Check cToken.comptroller == this
        require(address(cToken.comptroller()) == address(this), "Cannot support a market with a different Comptroller.");

        // Make sure market is not already listed
        address underlying = cToken.isCEther() ? address(0) : CErc20(address(cToken)).underlying();

        if (address(cTokensByUnderlying[underlying]) != address(0)) {
            return fail(Error.MARKET_ALREADY_LISTED, FailureInfo.SUPPORT_MARKET_EXISTS);
        }

        // List market and emit event
        markets[address(cToken)] = Market({isListed: true, collateralFactorMantissa: 0});
        allMarkets.push(cToken);
        cTokensByUnderlying[underlying] = cToken;
        emit MarketListed(cToken);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Deploy cToken, add the market to the markets mapping, and set it as listed and set the collateral factor
      * @dev Admin function to deploy cToken, set isListed, and add support for the market and set the collateral factor
      * @return uint 0=success, otherwise a failure. (See enum Error for details)
      */
    function _deployMarket(
        bool isCEther,
        bytes calldata constructorData,
        uint collateralFactorMantissa
    ) external returns (uint) {
        // Check caller is admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SUPPORT_MARKET_OWNER_CHECK);
        }

        // Temporarily enable Fuse admin rights for asset deployment (storing the original value)
        bool oldFuseAdminHasRights = fuseAdminHasRights;
        fuseAdminHasRights = true;

        // Deploy via Fuse admin
        CToken cToken = CToken(isCEther ? fuseAdmin.deployCEther(constructorData) : fuseAdmin.deployCErc20(constructorData));

        // Reset Fuse admin rights to the original value
        fuseAdminHasRights = oldFuseAdminHasRights;

        // Support market here in the Comptroller
        uint256 err = _supportMarket(cToken);

        // Set collateral factor
        return err == uint(Error.NO_ERROR) ? _setCollateralFactor(cToken, collateralFactorMantissa) : err;
    }

    /**
      * @notice Removed a market from the markets mapping and sets it as unlisted
      * @dev Admin function unset isListed and collateralFactorMantissa and unadd support for the market
      * @param cToken The address of the market (token) to unlist
      * @return uint 0=success, otherwise a failure. (See enum Error for details)
      */
    function _unsupportMarket(CToken cToken) external returns (uint) {
        // Check admin rights
        if (!hasAdminRights()) return fail(Error.UNAUTHORIZED, FailureInfo.UNSUPPORT_MARKET_OWNER_CHECK);

        // Check if market is already unlisted
        if (!markets[address(cToken)].isListed) return fail(Error.MARKET_NOT_LISTED, FailureInfo.UNSUPPORT_MARKET_DOES_NOT_EXIST);

        // Check if market is in use
        if (cToken.totalSupply() > 0) return fail(Error.NONZERO_TOTAL_SUPPLY, FailureInfo.UNSUPPORT_MARKET_IN_USE);

        // Unlist market
        delete markets[address(cToken)];
        
        /* Delete cToken from allMarkets */
        // load into memory for faster iteration
        CToken[] memory _allMarkets = allMarkets;
        uint len = _allMarkets.length;
        uint assetIndex = len;
        for (uint i = 0; i < len; i++) {
            if (_allMarkets[i] == cToken) {
                assetIndex = i;
                break;
            }
        }

        // We *must* have found the asset in the list or our redundant data structure is broken
        assert(assetIndex < len);

        // copy last item in list to location of item to be removed, reduce length by 1
        allMarkets[assetIndex] = allMarkets[allMarkets.length - 1];
        allMarkets.length--;

        cTokensByUnderlying[cToken.isCEther() ? address(0) : CErc20(address(cToken)).underlying()] = CToken(address(0));
        emit MarketUnlisted(cToken);

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Toggles the auto-implementation feature
     * @param enabled If the feature is to be enabled
     * @return uint 0=success, otherwise a failure. (See enum Error for details)
     */
    function _toggleAutoImplementations(bool enabled) public returns (uint) {
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.TOGGLE_AUTO_IMPLEMENTATIONS_ENABLED_OWNER_CHECK);
        }

        // Return no error if already set to the desired value
        if (autoImplementation == enabled) return uint(Error.NO_ERROR);

        // Store autoImplementation with value enabled
        autoImplementation = enabled;

        // Emit AutoImplementationsToggled(enabled)
        emit AutoImplementationsToggled(enabled);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Set the given supply caps for the given cToken markets. Supplying that brings total underlying supply to or above supply cap will revert.
      * @dev Admin or borrowCapGuardian function to set the supply caps. A supply cap of 0 corresponds to unlimited supplying.
      * @param cTokens The addresses of the markets (tokens) to change the supply caps for
      * @param newSupplyCaps The new supply cap values in underlying to be set. A value of 0 corresponds to unlimited supplying.
      */
    function _setMarketSupplyCaps(CToken[] calldata cTokens, uint[] calldata newSupplyCaps) external {
    	require(msg.sender == admin || msg.sender == borrowCapGuardian, "only admin or borrow cap guardian can set supply caps"); 

        uint numMarkets = cTokens.length;
        uint numSupplyCaps = newSupplyCaps.length;

        require(numMarkets != 0 && numMarkets == numSupplyCaps, "invalid input");

        for(uint i = 0; i < numMarkets; i++) {
            supplyCaps[address(cTokens[i])] = newSupplyCaps[i];
            emit NewSupplyCap(cTokens[i], newSupplyCaps[i]);
        }
    }

    /**
      * @notice Set the given borrow caps for the given cToken markets. Borrowing that brings total borrows to or above borrow cap will revert.
      * @dev Admin or borrowCapGuardian function to set the borrow caps. A borrow cap of 0 corresponds to unlimited borrowing.
      * @param cTokens The addresses of the markets (tokens) to change the borrow caps for
      * @param newBorrowCaps The new borrow cap values in underlying to be set. A value of 0 corresponds to unlimited borrowing.
      */
    function _setMarketBorrowCaps(CToken[] calldata cTokens, uint[] calldata newBorrowCaps) external {
    	require(msg.sender == admin || msg.sender == borrowCapGuardian, "only admin or borrow cap guardian can set borrow caps"); 

        uint numMarkets = cTokens.length;
        uint numBorrowCaps = newBorrowCaps.length;

        require(numMarkets != 0 && numMarkets == numBorrowCaps, "invalid input");

        for(uint i = 0; i < numMarkets; i++) {
            borrowCaps[address(cTokens[i])] = newBorrowCaps[i];
            emit NewBorrowCap(cTokens[i], newBorrowCaps[i]);
        }
    }

    /**
     * @notice Admin function to change the Borrow Cap Guardian
     * @param newBorrowCapGuardian The address of the new Borrow Cap Guardian
     */
    function _setBorrowCapGuardian(address newBorrowCapGuardian) external {
        require(msg.sender == admin, "only admin can set borrow cap guardian");

        // Save current value for inclusion in log
        address oldBorrowCapGuardian = borrowCapGuardian;

        // Store borrowCapGuardian with value newBorrowCapGuardian
        borrowCapGuardian = newBorrowCapGuardian;

        // Emit NewBorrowCapGuardian(OldBorrowCapGuardian, NewBorrowCapGuardian)
        emit NewBorrowCapGuardian(oldBorrowCapGuardian, newBorrowCapGuardian);
    }

    /**
     * @notice Admin function to change the Pause Guardian
     * @param newPauseGuardian The address of the new Pause Guardian
     * @return uint 0=success, otherwise a failure. (See enum Error for details)
     */
    function _setPauseGuardian(address newPauseGuardian) public returns (uint) {
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PAUSE_GUARDIAN_OWNER_CHECK);
        }

        // Save current value for inclusion in log
        address oldPauseGuardian = pauseGuardian;

        // Store pauseGuardian with value newPauseGuardian
        pauseGuardian = newPauseGuardian;

        // Emit NewPauseGuardian(OldPauseGuardian, NewPauseGuardian)
        emit NewPauseGuardian(oldPauseGuardian, pauseGuardian);

        return uint(Error.NO_ERROR);
    }

    function _setMintPaused(CToken cToken, bool state) public returns (bool) {
        require(markets[address(cToken)].isListed, "cannot pause a market that is not listed");
        require(msg.sender == pauseGuardian || hasAdminRights(), "only pause guardian and admin can pause");
        require(hasAdminRights() || state == true, "only admin can unpause");

        mintGuardianPaused[address(cToken)] = state;
        emit ActionPaused(cToken, "Mint", state);
        return state;
    }

    function _setBorrowPaused(CToken cToken, bool state) public returns (bool) {
        require(markets[address(cToken)].isListed, "cannot pause a market that is not listed");
        require(msg.sender == pauseGuardian || hasAdminRights(), "only pause guardian and admin can pause");
        require(hasAdminRights() || state == true, "only admin can unpause");

        borrowGuardianPaused[address(cToken)] = state;
        emit ActionPaused(cToken, "Borrow", state);
        return state;
    }

    function _setTransferPaused(bool state) public returns (bool) {
        require(msg.sender == pauseGuardian || hasAdminRights(), "only pause guardian and admin can pause");
        require(hasAdminRights() || state == true, "only admin can unpause");

        transferGuardianPaused = state;
        emit ActionPaused("Transfer", state);
        return state;
    }

    function _setSeizePaused(bool state) public returns (bool) {
        require(msg.sender == pauseGuardian || hasAdminRights(), "only pause guardian and admin can pause");
        require(hasAdminRights() || state == true, "only admin can unpause");

        seizeGuardianPaused = state;
        emit ActionPaused("Seize", state);
        return state;
    }

    function _become(Unitroller unitroller) public {
        require((msg.sender == address(fuseAdmin) && unitroller.fuseAdminHasRights()) || (msg.sender == unitroller.admin() && unitroller.adminHasRights()), "only unitroller admin can change brains");

        uint changeStatus = unitroller._acceptImplementation();
        require(changeStatus == 0, "change not authorized");

        Comptroller(address(unitroller))._becomeImplementation();
    }

    function _becomeImplementation() external {
        require(msg.sender == comptrollerImplementation, "only implementation may call _becomeImplementation");

        if (!_notEnteredInitialized) {
            _notEntered = true;
            _notEnteredInitialized = true;
        }
    }

    /*** Helper Functions ***/

    /**
     * @notice Return all of the markets
     * @dev The automatic getter may be used to access an individual market.
     * @return The list of market addresses
     */
    function getAllMarkets() public view returns (CToken[] memory) {
        return allMarkets;
    }

    /**
     * @notice Return all of the borrowers
     * @dev The automatic getter may be used to access an individual borrower.
     * @return The list of borrower account addresses
     */
    function getAllBorrowers() public view returns (address[] memory) {
        return allBorrowers;
    }

    /**
     * @notice Return all of the whitelist
     * @dev The automatic getter may be used to access an individual whitelist status.
     * @return The list of borrower account addresses
     */
    function getWhitelist() external view returns (address[] memory) {
        return whitelistArray;
    }

    /**
     * @notice Returns an array of all RewardsDistributors
     */
    function getRewardsDistributors() external view returns (address[] memory) {
        return rewardsDistributors;
    }

    /**
     * @notice Returns true if the given cToken market has been deprecated
     * @dev All borrows in a deprecated cToken market can be immediately liquidated
     * @param cToken The market to check if deprecated
     */
    function isDeprecated(CToken cToken) public view returns (bool) {
        return
            markets[address(cToken)].collateralFactorMantissa == 0 && 
            borrowGuardianPaused[address(cToken)] == true && 
            add_(add_(cToken.reserveFactorMantissa(), cToken.adminFeeMantissa()), cToken.fuseFeeMantissa()) == 1e18
        ;
    }

    /*** Pool-Wide/Cross-Asset Reentrancy Prevention ***/

    /**
     * @dev Called by cTokens before a non-reentrant function for pool-wide reentrancy prevention.
     * Prevents pool-wide/cross-asset reentrancy exploits like AMP on Cream.
     */
    function _beforeNonReentrant() external {
        require(markets[msg.sender].isListed, "Comptroller:_beforeNonReentrant: caller not listed as market");
        require(_notEntered, "re-entered across assets");
        _notEntered = false;
    }

    /**
     * @dev Called by cTokens after a non-reentrant function for pool-wide reentrancy prevention.
     * Prevents pool-wide/cross-asset reentrancy exploits like AMP on Cream.
     */
    function _afterNonReentrant() external {
        require(markets[msg.sender].isListed, "Comptroller:_afterNonReentrant: caller not listed as market");
        _notEntered = true; // get a gas-refund post-Istanbul
    }
}
