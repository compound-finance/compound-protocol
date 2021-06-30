# Changelog

## `v1.1.0` (contracts not yet deployed; all code not yet pushed)

* Support larger error codes in `CEther` (up to 9999 instead of just 99).
* Complete supplier whitelist feature in `Comptroller`.
* Non-redundant admin storage on Comptroller (i.e., remove from cTokens in favor of references to Comptroller).
* Deploy markets via `Comptroller` in a single transaction.
* Whitelisted `Comptroller` implementations, `CErc20Delegate`s, `CEtherDelegate`s, `CErc20Delegator`s, and `CEtherDelegator`s.
* Disable changing Comptroller after cToken initialization.
* Automatic implementation upgrading.
* Add `_setNameAndSymbol` admin function to `CToken`.
* Replace function for renouncing admin/Fuse admin rights with a toggle function.

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
