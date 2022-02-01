// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

/**
 * @title Ribbon Vault Interface
 * @notice Returns price per share of vault token to underlying
 * @dev Implements the `RibbonVault` interface.
 */
interface RibbonVault {
    function pricePerShare() external view returns (address);
    function decimals() external view returns (uint8);
}
