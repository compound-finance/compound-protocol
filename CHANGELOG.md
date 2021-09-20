# Changelog

## `v1.1.0` (contracts not yet deployed; all code not yet pushed)

* Move `_setImplementation` from `CErc20Delegator` and `CEtherDelegator` to `_setImplementationSafe` on `CErc20Delegate`, `CEtherDelegate`.
* Merge `CErc20._delegateCompLikeTo` from `master` branch of `compound-finance/compound-protocol`.
* Remove `initialExchangeRateMantissa` and `decimals` parameters from `CErc20` and `CEther` initializers.
* Remove `CErc20._addReserves` to save deployment size.
* Remove `CErc20Immutable` and `CEtherImmutable` (only their proxy contract equivalents will be deployed).
* Support larger error codes in `CEther` (up to 9999 instead of just 99).
* Complete supplier/borrower whitelist feature in `Comptroller`.
* Non-redundant admin storage on Comptroller (i.e., remove from cTokens in favor of references to Comptroller).
* Deploy markets via `Comptroller` in a single transaction.
* Whitelisted `Comptroller` implementations, `CErc20Delegate`s, `CEtherDelegate`s, `CErc20Delegator`s, and `CEtherDelegator`s.
* Disable changing Comptroller after cToken initialization.
* Automatic implementation upgrades on `Unitroller`, `CErc20Delegator`, and `CEtherDelegator`.
* Add `_setNameAndSymbol` admin function to `CToken`.
* Replace function for renouncing admin/Fuse admin rights with a toggle function.
* Converge `_setFuseFee` into `_setAdminFee` to save deployment size.
* Comment out unused defense hooks in `CToken` (as was done in `master` branch of `compound-finance/compound-protocol`).
* Pool-wide/cross-asset reentrancy protection (to prevent exploits like AMP on Cream).
* Replace `Exponential` math with `ExponentialNoError` (merged from `master` branch of `compound-finance/compound-protocol`) to save `CToken` annd `Comptroller` deployment size.
* Merge protocol seize share from `master` branch of `compound-finance/compound-protocol`.
* Use safe math when adding reserve factor and fee rates.
* Use safe math when adding reserves and fees (QSP-2).
* Use safe math library instead of manually checking for overflow in `_withdrawFuseFees` and `_withdrawAdminFees`.
* Move code inside `nonReentrant` modifier to internal functions to save `CToken` deployment size.
* Added per-asset borrow cap and supply cap guardian to pool `Comptroller`.
* Remove constructor setting `Comptroller` admin to deployer since `Comptroller` will not be deployed without a proxy.
* Liquidity mining via `RewardsDistributor`.
* Remove global per-user supply cap.
* Add `isDeprecated` to `Comptroller` to enable liquidating all borrows on deprecated markets.
* Move `getMaxRedeem` and `getMaxBorrow` view functions from `Comptroller` to external lens (see `FusePoolLens` in `Rari-Capital/fuse-contracts`).
* Remove `maxAssets` and `_setMaxAssets` to save `Comptroller` deployment size.
* Double-check `isCToken` marker method in `_supportMarket` (QSP-4).

## `v1.0.2` (contracts deployed 2021-05-18; all code pushed 2021-06-24)

* Fixed `CErc20.doTransferIn` and `CErc20.doTransferOut` to support v2 yVaults.
* In `CToken._reduceReserves`, send to admin or Fuse admin depending on the caller, not just admin.
* Temporarily remove max utilization rate check in `CToken` to avoid breaching contract size limit.

## `v1.0.1` (contracts deployed 2021-03-18; all code pushed 2021-03-18)

* Add `Comptroller._unsupportMarket` function.

## `v1.0.0` (contracts deployed 2020-03-17; all code pushed 2021-03-17)

* Forked branch `v2.7` of `compound-finance/compound-protocol`.
* Replaced checks for `msg.sender == admin` with `hasAdminRights()` (i.e., sender must be admin or Fuse admin and must have not renounced their rights).
* Set reserve factor in CToken initializers.
* Admin fee on interest and Fuse fee on interest.
* Slim down `CErc20Delegator` deployment by removing explicit declarations of delegated functions.
* Create `CEtherDelegator` and `CEtherDelegate` (and `CEtherImmutable` as `CEther` can no longer be deployed on its own).
* Use `call.value` instead of `transfer` in `CEther.doTransferOut`.
* Global maximum supply constraint per asset per pool per user.
* Global minimum borrow constraint per asset per pool per user.
* Global maximum utilization rate constraint.
* Add `isCEther` variable to `CToken` contracts.
* Add `allBorrowers` array and `borrowers` mapping to `Comptroller`.
* Add `suppliers` mapping to `Comptroller`.
* Add `allMarkets` array to `Comptroller`.
* Add variables for future supplier whitelist feature to `Comptroller`.
* Add `getMaxRedeem` and `getMaxBorrow` view functions to `Comptroller`.
* Add additional sanity checks to `_supportMarket` (check `CToken.comptroller()` and make sure underlying asset is not already listed).
* Add `cTokensByUnderlying` mapping to `Comptroller`.
* Add `Comptroller._supportMarketAndSetCollateralFactor` function.
* Delete `PriceOracleProxy`.
* Fix `shasum -p` to `shasum -U` in shell scripts.
