pragma solidity ^0.5.16;

contract CWrappedNativeStorage {
    uint256 internal constant USE_WRAPPED = 1;
    uint256 internal constant USE_NATIVE = 2;

    /**
     * @notice Underlying asset for this CToken
     */
    uint256 internal nativeStatus = USE_WRAPPED;
}