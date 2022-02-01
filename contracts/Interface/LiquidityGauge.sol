// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

/**
 * @title LiquidityGauge Interface
 * @notice Returns the LP token of a gauge (vault token like rETH-THETA)
 * @dev Implements the `LiquidityGauge` interface.
 */
interface LiquidityGauge {
    function LP_TOKEN() external view returns (address);
}
