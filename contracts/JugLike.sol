// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

/// @notice Imported into DAIInterestRateModelV3.sol

contract JugLike {
    // --- Data ---
    struct Ilk {
        uint256 duty;
        uint256  rho;
    }

    mapping (bytes32 => Ilk) public ilks;
    uint256 public base;
}